# Data Mapping: Source Records to HubSpot

This document clarifies the mapping between source property data identifiers and HubSpot Listings custom object fields.

## Identifier Fields Overview

Source property records contain multiple identifier fields. Understanding their purpose prevents confusion when integrating with HubSpot.

| Field | Description | HubSpot Mapping |
|-------|-------------|-----------------|
| `assetId` | **Primary identifier** - Unique numeric ID for each property | `external_listing_id` |
| `assetItemId` | Internal item ID (related to asset inventory) | Not mapped |
| `assetReferenceId` | Secondary, human-facing reference number | Store in `reference_id` if needed |

## Key Distinction: assetId vs assetReferenceId

### `assetId` (Primary External ID)

- **Purpose**: Authoritative unique identifier for each property listing
- **HubSpot field**: `external_listing_id`
- **Example**: `22242`
- **Used for**: HubSpot Listing lookups, Contact-Listing associations, URL routing

### `assetReferenceId` (Secondary Reference)

- **Purpose**: Human-facing reference number, often used internally
- **HubSpot field**: Should be stored separately (e.g., `reference_id`), **not** in `external_listing_id`
- **Example**: `190402`
- **Used for**: Internal tracking, legacy system references, human readability

### Why This Matters

The `external_listing_id` in HubSpot is the **authoritative join key** between:
- The website's property detail pages (URLs like `/properties/22242`)
- HubSpot's Listings custom object records
- Contact-Listing associations created when users submit inquiry forms

Using `assetId` as the external ID ensures:
1. **Consistency**: Property URLs match HubSpot lookup values
2. **Reliability**: No ambiguity about which identifier to use
3. **Simplicity**: One-to-one mapping without translation

## Example: Property at 1104 LUCHARLES AVE, MOUNT MORRIS, MI 48458

```json
{
  "assetId": 22242,           // ← This is external_listing_id in HubSpot
  "assetItemId": 22227,
  "assetReferenceId": "190402", // ← Secondary reference, NOT the external ID
  "addressLine1": "1104 LUCHARLES AVE",
  "city": "MOUNT MORRIS",
  "state": "MI",
  "zip": "48458"
}
```

In this case:
- Website URL: `/properties/22242`
- HubSpot `external_listing_id`: `22242`
- The `assetReferenceId` of `190402` is a separate internal reference

## Implementation in Code

### Property Data (`src/data/properties.ts`)

Properties use `assetId` as their `id` field:

```typescript
{
  id: '22242',  // This is the assetId from source data
  title: 'Mount Morris Property',
  address: '1104 Lucharles Ave',
  // ...
}
```

### Request Info Form (`src/app/api/request-info/route.ts`)

The API expects `external_listing_id` matching the property `id` (which is `assetId`):

```typescript
{
  external_listing_id: '22242',  // Matches property.id and assetId
  // ...
}
```

### HubSpot Lookup (`src/lib/hubspot.ts`)

The `findListingByExternalId` function searches HubSpot using `external_listing_id`:

```typescript
propertyName: 'external_listing_id',
value: externalListingId,  // e.g., '22242'
```

## Best Practices

1. **Never use `assetReferenceId` as `external_listing_id`** - This causes lookup failures
2. **Always use `assetId` for external integrations** - It's the authoritative identifier
3. **Store `assetReferenceId` separately** - If needed, use a dedicated field like `reference_id`
4. **Document ID sources clearly** - When syncing data, note which source field maps to which target
5. **Always resolve Listing ID before associations** - Use `findListingByExternalId()` to get the HubSpot record ID

## Association Workflow

When creating Contact-Listing associations in HubSpot, always follow this pattern:

### Correct Workflow

```
1. Get external_listing_id (assetId) from form submission
   ↓
2. Call findListingByExternalId(assetId) to get HubSpot Listing ID
   ↓
3. Check if lookup succeeded (fail fast if not found)
   ↓
4. Call associateContactToListing(contactId, hubspotListingId)
```

### Why This Prevents 500 Errors

- The HubSpot Associations API requires **HubSpot record IDs**, not external identifiers
- Passing `assetId` directly to the association API will fail with a 500 error
- Passing `assetReferenceId` will also fail because it's not even in HubSpot's `external_listing_id` field
- By resolving the ID first, we ensure we have a valid HubSpot record to associate

### Code Example

```typescript
// ✅ CORRECT: Resolve the HubSpot Listing ID first
const listingResult = await findListingByExternalId(assetId);
if (!listingResult.success) {
  // Fail fast - do not attempt association
  console.error('Listing not found for assetId:', assetId);
  return;
}
await associateContactToListing(contactId, listingResult.listingId);

// ❌ WRONG: Using external ID directly
await associateContactToListing(contactId, assetId);  // Will fail!

// ❌ WRONG: Using assetReferenceId
await associateContactToListing(contactId, assetReferenceId);  // Will fail!
```

## Troubleshooting

### 500 "Internal Error" on Association

If you're getting 500 errors when creating associations:

1. **Check that you're using the HubSpot Listing ID**, not the external_listing_id (assetId)
2. **Ensure the Listing lookup succeeded** before calling the association API
3. **Verify the Listing exists** in HubSpot with the correct `external_listing_id`
4. **Check the logs** for the resolved HubSpot ID - it should be a numeric HubSpot record ID

### "Listing not found" errors

If Contact-Listing associations fail with "listing not found":
1. Verify the `external_listing_id` in HubSpot matches the `assetId` from source data
2. Ensure HubSpot records were created with `assetId`, not `assetReferenceId`
3. Check that the value is stored as a string in HubSpot

### Mismatched IDs

If HubSpot records have `assetReferenceId` in `external_listing_id`:
1. This is incorrect and should be corrected
2. Update HubSpot records to use `assetId` values instead
3. Do not change existing HubSpot record IDs - update the `external_listing_id` property value

### Silent Association Failures

If associations are silently failing:
1. Check server logs for "Failed to create Contact-Listing association" messages
2. Verify both contactId and listingId are valid HubSpot record IDs
3. Ensure the HubSpot Private App has the required scopes for associations
