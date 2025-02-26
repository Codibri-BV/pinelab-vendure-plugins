# 2.2.1 (2023-11-06)

- Extended the `HistoryEntryList` enum to make stripe subscription  custom history entry component work

# 2.2.0 (2023-11-08)

- Return subscriptions per order line on orders

# 2.1.0 (2023-11-02)

- Updated vendure to 2.1.1

# 2.0.0 (2023-11-02)

- Major refactor: ([#260](https://github.com/Pinelab-studio/pinelab-vendure-plugins/pull/260))
- Scheduling has been taken out of this plugin.
- By default product variants are seen as monthly subscriptions
- Custom subscriptions can be defined by implementing the SubscriptionStrategy interface

# 1.4.0 (2023-09-08)

- Expose proxy function to retrieve all subscriptions for current channel ([#255](https://github.com/Pinelab-studio/pinelab-vendure-plugins/pull/255))

# 1.3.2 (2023-09-06)

- Fixed selecting schedules on a variant ([#253](https://github.com/Pinelab-studio/pinelab-vendure-plugins/pull/253))

# 1.1.0 (2023-08-11)

- Expose Stripe publishable key via `eligiblePaymemtMethods.stripeSubscriptionPublishableKey` ([#242](https://github.com/Pinelab-studio/pinelab-vendure-plugins/pull/242))
