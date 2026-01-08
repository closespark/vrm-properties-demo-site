# Request Info Form Integration Guide

This document explains how the "Request Info" form submission workflow integrates with HubSpot for lead capture and property association.

## Overview

The Request Info form on listing detail pages captures user inquiries and creates a complete workflow in HubSpot:

1. **Contact Creation/Update** - Creates a new Contact or updates an existing one (email-based dedupe)
2. **Marketing Consent** - Marks the Contact as marketing-eligible when user opts in
3. **Listing Lookup** - Finds the associated Listing record using `external_listing_id`
4. **Contact-Listing Association** - Creates a CRM association between the Contact and Listing

## How external_listing_id Works

The `external_listing_id` is the **authoritative join key** between the website's property listings and HubSpot's Listings custom object.

> **Important**: The `external_listing_id` in HubSpot **always maps to `assetId`** from the source data, NOT to `assetReferenceId`. See [DATA_MAPPING.md](./DATA_MAPPING.md) for detailed identifier documentation.

### Why external_listing_id?

- **Decoupled from HubSpot IDs**: The website uses its own property IDs, independent of HubSpot's internal record IDs
- **Data Sync Resilience**: If HubSpot records are recreated, the external ID allows re-association
- **Source of Truth**: The property ID from the source system (the website) is always consistent

### Source Data Identifiers

Source property records contain multiple identifiers:

| Field | Purpose | Maps to HubSpot |
|-------|---------|-----------------|
| `assetId` | Primary unique identifier | `external_listing_id` ✓ |
| `assetReferenceId` | Secondary internal reference | Separate field (e.g., `reference_id`) |

The `assetReferenceId` is a human-facing reference and should **NOT** be treated as the primary external ID.

### Flow

1. User visits a property page (e.g., `/properties/22317`)
2. The property ID (`22317`) is passed to the form as `external_listing_id`
3. When submitted, the API looks up the Listing in HubSpot where `external_listing_id = "22317"`
4. If found, the Contact is associated with that Listing

### HubSpot Listings Object

Your HubSpot account needs a custom object called "Listings" with a property named `external_listing_id` that matches your website's property IDs.

## How Contacts Become Marketing-Eligible

### Explicit Opt-In Requirement

The form requires users to explicitly check a marketing opt-in checkbox before submission. This ensures:

- **GDPR Compliance**: Users give informed consent
- **No Assumed Consent**: Only users who actively opt in receive marketing
- **Audit Trail**: The consent is recorded in HubSpot

### Technical Implementation

When `marketing_opt_in = true`:

1. The API submits the form data to HubSpot Forms API (creates/updates Contact)
2. After a brief delay (to allow HubSpot processing), the API searches for the Contact by email
3. The Contact's `hs_legal_basis` property is set to "Freely given consent from contact"

### Form Validation

The API **rejects** submissions where `marketing_opt_in` is not `true`:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "marketing_opt_in",
      "message": "Marketing opt-in must be true. User must explicitly consent to receive marketing communications."
    }
  ]
}
```

## How Contact ↔ Listing Associations Work

### Many-to-Many Relationship

The integration supports:
- **One Contact → Many Listings**: A user can inquire about multiple properties
- **One Listing → Many Contacts**: Multiple users can inquire about the same property

### Association Process

1. After setting marketing consent, the API retrieves the Contact ID
2. The API searches for the Listing by `external_listing_id`
3. Using HubSpot's CRM Associations API, a link is created between Contact and Listing

### Idempotent Associations

HubSpot's Associations API is idempotent - calling it multiple times with the same Contact-Listing pair won't create duplicate associations.

## API Endpoint

### POST /api/request-info

Handles form submissions server-side.

#### Request Body

```json
{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john.doe@example.com",
  "phone": "(555) 123-4567",
  "external_listing_id": "22317",
  "marketing_opt_in": true,
  "pageUri": "https://example.com/properties/22317",
  "pageName": "Property - 22317"
}
```

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `firstname` | string | Contact's first name |
| `lastname` | string | Contact's last name |
| `email` | string | Valid email address (used for dedupe) |
| `external_listing_id` | string | Property ID for Listing association |
| `marketing_opt_in` | boolean | Must be `true` |

#### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `phone` | string | Contact's phone number |
| `pageUri` | string | URL of the form page |
| `pageName` | string | Title of the form page |

#### Success Response

```json
{
  "success": true,
  "message": "Request submitted successfully",
  "details": {
    "contactSubmitted": true,
    "marketingConsentSet": true,
    "listingFound": true,
    "associationCreated": true
  }
}
```

#### Partial Success Response

If the Listing is not found, the Contact is still created:

```json
{
  "success": true,
  "message": "Contact created successfully, but listing not found for association",
  "details": {
    "contactSubmitted": true,
    "marketingConsentSet": true,
    "listingFound": false,
    "associationCreated": false
  }
}
```

## Environment Variables

All HubSpot identifiers and credentials are read from environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `HUBSPOT_PORTAL_ID` | Yes | HubSpot portal ID (Hub ID) |
| `HUBSPOT_FORM_GUID` | Yes | Form GUID for contact creation |
| `HUBSPOT_ACCESS_TOKEN` | Yes | Private App access token (server-side only) |
| `HUBSPOT_LISTINGS_OBJECT_TYPE` | No | Custom object type ID (default: `listings`) |

### Legacy Variables (Backwards Compatibility)

These are used as fallbacks if the above are not set:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_HUBSPOT_PORTAL_ID` | Public portal ID |
| `NEXT_PUBLIC_HUBSPOT_FORM_GUID` | Public form GUID |

## Security Considerations

### Server-Side Processing

All HubSpot API calls are made server-side to:
- Keep the `HUBSPOT_ACCESS_TOKEN` secret
- Validate input before sending to HubSpot
- Control the association workflow

### Input Validation

The API validates:
- Email format
- Required fields presence
- Marketing opt-in is explicitly `true`

### No Hardcoded Credentials

All HubSpot identifiers are injected via environment variables, making the codebase safe for public repositories.

## Error Handling

### Logged Errors

The following are logged but don't fail the request:
- Marketing consent update failures
- Listing not found
- Association creation failures

### Fatal Errors

The following fail the request:
- Form submission to HubSpot fails
- Invalid request body
- Missing required fields

## Testing

### Local Development

1. Set up environment variables in `.env.local`:
   ```bash
   HUBSPOT_PORTAL_ID=your_portal_id
   HUBSPOT_FORM_GUID=your_form_guid
   HUBSPOT_ACCESS_TOKEN=your_access_token
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Navigate to a property page and submit the form

### Verify in HubSpot

After submission:
1. Check Contacts for the new/updated record
2. Verify the `hs_legal_basis` property is set
3. Check the Contact's associations for the Listing link
