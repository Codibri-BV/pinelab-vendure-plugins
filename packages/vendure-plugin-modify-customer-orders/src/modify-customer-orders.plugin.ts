import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import { adminApiExtension } from './api/api.extension';
import { AdminApiResolver } from './api/api.resolver';
import { OrderTransitionListenerService } from './api/order-transition-listener.service';
import { convertToDraftButton } from './ui';
import { PLUGIN_INIT_OPTIONS } from './constants';

export interface ModifyCustomerOrdersPluginOptions {
  /**
   * Automatically connect draft orders as active order to the customer,
   * when you click `Complete draft` in the admin ui
   */
  autoAssignDraftOrdersToCustomer: boolean;
}

@VendurePlugin({
  imports: [PluginCommonModule],
  adminApiExtensions: {
    resolvers: [AdminApiResolver],
    // FIXME
    schema: adminApiExtension as any,
  },
  providers: [
    OrderTransitionListenerService,
    {
      provide: PLUGIN_INIT_OPTIONS,
      useFactory: () => ModifyCustomerOrdersPlugin.options,
    },
  ],
})
export class ModifyCustomerOrdersPlugin {
  static options: ModifyCustomerOrdersPluginOptions = {
    autoAssignDraftOrdersToCustomer: false,
  };
  static ui: AdminUiExtension = convertToDraftButton;
  static init(
    options: ModifyCustomerOrdersPluginOptions
  ): typeof ModifyCustomerOrdersPlugin {
    this.options = options;
    return ModifyCustomerOrdersPlugin;
  }
}
