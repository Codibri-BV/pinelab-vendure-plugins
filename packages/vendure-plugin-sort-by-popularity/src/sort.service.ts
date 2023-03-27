import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ChannelService,
  Collection,
  CollectionService,
  ID,
  JobQueue,
  JobQueueService,
  OrderItem,
  Product,
  RequestContext,
  SerializedRequestContext,
  TransactionalConnection,
} from '@vendure/core';
import { Success } from '../../test/src/generated/admin-graphql';
import { Logger } from '@vendure/core';
@Injectable()
export class SortService implements OnModuleInit {
  private jobQueue: JobQueue<{
    channelToken: string;
    ctx: SerializedRequestContext;
  }>;
  constructor(
    private connection: TransactionalConnection,
    private jobQueueService: JobQueueService,
    private channelService: ChannelService,
    private collectionService: CollectionService
  ) {}
  async onModuleInit() {
    this.jobQueue = await this.jobQueueService.createQueue({
      name: 'calculate-popularity-scores',
      process: async (job) => {
        const channel = await this.channelService.getChannelFromToken(
          job.data.channelToken
        );
        this.setProductPopularity(
          RequestContext.deserialize(job.data.ctx),
          channel.id
        );
      },
    });
  }

  async setProductPopularity(
    ctx: RequestContext,
    channelId: ID
  ): Promise<void> {
    const groupedOrderItems = await this.connection
      .getRepository(ctx, OrderItem)
      .createQueryBuilder('orderItem')
      .innerJoin('orderItem.line', 'orderLine')
      .select([
        'count(product.id) as count',
        'orderItem.line',
        'orderLine.productVariant',
        'orderLine.order',
      ])
      .innerJoin('orderLine.productVariant', 'productVariant')
      .addSelect([
        'productVariant.deletedAt',
        'productVariant.enabled',
        'productVariant.id',
      ])
      .innerJoin('orderLine.order', 'order')
      .innerJoin('productVariant.product', 'product')
      .addSelect(['product.deletedAt', 'product.enabled', 'product.id'])
      .innerJoin('productVariant.collections', 'collection')
      .addSelect(['collection.id'])
      .innerJoin('order.channels', 'order_channel')
      .andWhere('order.orderPlacedAt is NOT NULL')
      .andWhere('product.deletedAt IS NULL')
      .andWhere('productVariant.deletedAt IS NULL')
      .andWhere('product.enabled')
      .andWhere('productVariant.enabled')
      .andWhere('order_channel.id = :id', { id: channelId })
      .addGroupBy('product.id')
      .addOrderBy('count', 'DESC')
      .getRawMany();
    const maxCount = groupedOrderItems[0].count;
    const maxValue = 1000;
    const productRepository = this.connection.getRepository(ctx, Product);
    await productRepository.save(
      groupedOrderItems.map((gols) => {
        return {
          id: gols.product_id,
          customFields: {
            popularityScore: Math.round((gols.count / maxCount) * maxValue),
          },
        };
      })
    );
    await this.assignScoreValuesToCollections(ctx);
    Logger.info(
      `Finished calculating popularity scores`,
      'SortByPopularityPlugin'
    );
  }
  async assignScoreValuesToCollections(ctx: RequestContext) {
    const allCollectionsScores = await this.getEachCollectionsScore(ctx);
    await this.addUpTheTreeAndSave(allCollectionsScores, ctx);
  }

  /**
   * This calculates the score of a collection based on its products.
   * Does not include scores of subcollections yet
   * @param ctx
   * @returns Array of collection ids and their corresponding popularity scores not including subcollections
   */
  async getEachCollectionsScore(
    ctx: RequestContext
  ): Promise<{ id: string; score: number }[]> {
    const collectionsRepo = this.connection.getRepository(ctx, Collection);
    const productsRepo = this.connection.getRepository(ctx, Product);
    const allCollectionIds = await collectionsRepo
      .createQueryBuilder('collection')
      .select(['collection.id'])
      .innerJoin('collection.channels', 'collection_channel')
      .andWhere('collection_channel.id = :id', { id: ctx.channelId })
      .getRawMany();
    const productScoreSums: { id: string; score: number }[] = [];
    const variantsPartialInfoQuery = collectionsRepo
      .createQueryBuilder('collection')
      .select('collection.id')
      .leftJoin('collection.productVariants', 'productVariant')
      .addSelect('productVariant.productId');
    const productSummingQuery = productsRepo
      .createQueryBuilder('product')
      .select('SUM(product.customFields.popularityScore) AS productScoreSum');
    for (const col of allCollectionIds) {
      const variantsPartialInfo = await variantsPartialInfoQuery
        .where('collection.id= :id', { id: col.id })
        .getRawMany();

      const productIds = variantsPartialInfo
        .filter((i) => i.productVariant_productId != null)
        .map((i) => i.productVariant_productId);

      const uniqueProductIds = [...new Set(productIds)];

      const summedProductsValue = await productSummingQuery
        .where('product.id IN (:...ids)', { ids: uniqueProductIds })
        .getRawOne();
      productScoreSums.push({
        id: col.id,
        score: summedProductsValue.productScoreSum,
      });
    }
    await collectionsRepo.save(
      productScoreSums.map((collection) => {
        return {
          id: collection.id,
          customFields: {
            popularityScore: collection.score ?? 0,
          },
        };
      })
    );
    return productScoreSums;
  }

  /**
   *
   * @param input Array of collection ids and their corresponding popularity scores not including subcollections
   * @param ctx The current RequestContext
   */
  async addUpTheTreeAndSave(
    input: { id: string; score: number }[],
    ctx: RequestContext
  ) {
    const collectionsRepo = this.connection.getRepository(ctx, Collection);
    for (const colIndex in input) {
      const desc: number = (
        await this.collectionService.getDescendants(ctx, input[colIndex].id)
      )
        .map((d) => (d.customFields as any).popularityScore)
        .reduce((partialSum: number, a: number) => partialSum + a, 0);
      input[colIndex].score += desc;
    }
    await collectionsRepo.save(
      input.map((collection) => {
        return {
          id: collection.id,
          customFields: {
            popularityScore: collection.score ?? 0,
          },
        };
      })
    );
  }

  addScoreCalculatingJobToQueue(channelToken: string, ctx: RequestContext) {
    return this.jobQueue.add(
      { channelToken, ctx: ctx.serialize() },
      { retries: 5 }
    );
  }
}
