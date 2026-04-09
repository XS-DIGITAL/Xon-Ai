# Database Updates

The following updates were made to the MongoDB schema:

## Config Collection
- Added `flwPlanId` (String, optional): Stores the Flutterwave Payment Plan ID for recurring subscriptions.

## UserKey Collection
- Added `flutterwaveRef` (String, optional): Stores the transaction reference or subscription ID from Flutterwave.
- Added `flwSubscriptionId` (String, optional): Stores the specific subscription ID from Flutterwave for recurring plans.
- Added `nextPaymentDate` (Date, optional): Stores the next billing date for subscription-based keys.

### SQL Equivalent (for reference)
```sql
ALTER TABLE config ADD COLUMN flwPlanId VARCHAR(255);
ALTER TABLE user_keys ADD COLUMN flutterwaveRef VARCHAR(255);
ALTER TABLE user_keys ADD COLUMN flwSubscriptionId VARCHAR(255);
ALTER TABLE user_keys ADD COLUMN nextPaymentDate TIMESTAMP;
```
