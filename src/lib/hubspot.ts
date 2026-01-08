/**
 * HubSpot API Integration Helpers
 * 
 * This module provides server-side functions for interacting with HubSpot APIs:
 * - Forms API for contact creation/update
 * - CRM API for listing lookup and contact-listing associations
 * - Marketing consent management
 * 
 * All HubSpot identifiers and credentials are read from environment variables
 * to keep the codebase safe for public repositories.
 */

// ============================================================================
// Types
// ============================================================================

export interface RequestInfoFormData {
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  /**
   * The external listing ID used for HubSpot Listing lookups.
   * This value corresponds to `assetId` from source property data.
   * Do NOT use `assetReferenceId` - it's a secondary reference.
   * See DATA_MAPPING.md for identifier documentation.
   */
  external_listing_id: string;
  marketing_opt_in: boolean;
  pageUri?: string;
  pageName?: string;
}

export interface HubSpotFormSubmissionResult {
  success: boolean;
  error?: string;
  contactId?: string;
}

export interface HubSpotListingLookupResult {
  success: boolean;
  listingId?: string;
  error?: string;
  /**
   * Indicates whether the listing was not found (vs. an API error).
   * When true, the external_listing_id was valid but no matching record exists in HubSpot.
   * This allows callers to distinguish between "not found" and "API failure" scenarios.
   */
  notFound?: boolean;
}

export interface HubSpotAssociationResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Environment Variable Helpers
// ============================================================================

/**
 * Gets the HubSpot Portal ID from server-side environment variables.
 * Required for both Forms API and CRM API calls.
 * 
 * Note: This function only reads server-side environment variables (HUBSPOT_PORTAL_ID).
 * The NEXT_PUBLIC_ variant is only for client-side use and is not accessed here
 * to maintain clear separation between client and server credentials.
 */
function getPortalId(): string {
  const portalId = process.env.HUBSPOT_PORTAL_ID;
  if (!portalId) {
    throw new Error('HUBSPOT_PORTAL_ID environment variable is not set');
  }
  return portalId;
}

/**
 * Gets the HubSpot Form GUID from server-side environment variables.
 * Required for Forms API submissions.
 * 
 * Note: This function only reads server-side environment variables (HUBSPOT_FORM_GUID).
 * The NEXT_PUBLIC_ variant is only for client-side use and is not accessed here
 * to maintain clear separation between client and server credentials.
 */
function getFormGuid(): string {
  const formGuid = process.env.HUBSPOT_FORM_GUID;
  if (!formGuid) {
    throw new Error('HUBSPOT_FORM_GUID environment variable is not set');
  }
  return formGuid;
}

/**
 * Gets the HubSpot Private App Access Token from environment variables.
 * Required for CRM API calls (listing lookup, associations, marketing consent).
 * This is a server-side only secret and should never be exposed to the client.
 */
function getAccessToken(): string {
  const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is not set');
  }
  return accessToken;
}

// ============================================================================
// HubSpot Forms API
// ============================================================================

/**
 * Submits contact data to HubSpot using the Forms API.
 * 
 * This function handles both creation of new contacts and updating existing ones.
 * HubSpot automatically deduplicates contacts based on email address - if a contact
 * with the same email already exists, it will be updated instead of creating a duplicate.
 * 
 * @param formData - The form data to submit
 * @returns Result indicating success/failure and optional contact ID
 */
export async function submitContactToHubSpot(
  formData: RequestInfoFormData
): Promise<HubSpotFormSubmissionResult> {
  try {
    const portalId = getPortalId();
    const formGuid = getFormGuid();
    
    // Build the HubSpot form fields array
    // The Forms API expects an array of {name, value} objects
    const fields = [
      { name: 'firstname', value: formData.firstname },
      { name: 'lastname', value: formData.lastname },
      { name: 'email', value: formData.email },
      { name: 'external_listing_id', value: formData.external_listing_id },
    ];

    // Add optional phone field if provided
    if (formData.phone) {
      fields.push({ name: 'phone', value: formData.phone });
    }

    // Add marketing opt-in as a field (HubSpot will use this for consent tracking)
    fields.push({ name: 'marketing_opt_in', value: String(formData.marketing_opt_in) });

    const hubspotPayload = {
      fields,
      context: {
        pageUri: formData.pageUri || '',
        pageName: formData.pageName || '',
      },
    };

    // Submit to HubSpot Forms API
    // API endpoint: https://api.hsforms.com/submissions/v3/integration/submit/:portalId/:formId
    const response = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hubspotPayload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('HubSpot Forms API error:', errorData);
      return {
        success: false,
        error: `HubSpot Forms API error: ${response.status} ${response.statusText}`,
      };
    }

    const result = await response.json();
    
    return {
      success: true,
      // The Forms API doesn't directly return contactId, but we can look it up after
      contactId: result.contactId,
    };
  } catch (error) {
    console.error('Error submitting to HubSpot Forms API:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// Marketing Consent Management
// ============================================================================

/**
 * Sets marketing consent/eligibility for a contact in HubSpot.
 * 
 * This function marks a contact as marketing-eligible after explicit opt-in.
 * It uses the HubSpot CRM API to update the contact's marketing subscription status.
 * 
 * Note: This should only be called when marketing_opt_in is true, as we should
 * not assume global opt-in for users who haven't explicitly consented.
 * 
 * @param email - The contact's email address (used as identifier)
 * @returns Result indicating success/failure
 */
export async function setMarketingConsent(
  email: string
): Promise<{ success: boolean; error?: string; contactId?: string }> {
  try {
    const accessToken = getAccessToken();

    // First, search for the contact by email to get their ID
    // We need the contact ID to update their properties
    const searchResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email,
                },
              ],
            },
          ],
          properties: ['email', 'firstname', 'lastname'],
        }),
      }
    );

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json().catch(() => ({}));
      console.error('HubSpot contact search error:', errorData);
      return {
        success: false,
        error: `Failed to find contact: ${searchResponse.status}`,
      };
    }

    const searchResult = await searchResponse.json();
    
    if (!searchResult.results || searchResult.results.length === 0) {
      // Contact not found - this can happen if there's a delay in contact creation
      console.warn('Contact not found for email:', email);
      return {
        success: false,
        error: 'Contact not found in HubSpot',
      };
    }

    const contactId = searchResult.results[0].id;

    // Update the contact to mark them as marketing-eligible
    // We set the hs_legal_basis property to indicate lawful basis for processing
    // and update subscription status
    const updateResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            // Set legal basis for marketing communications
            // This indicates the contact has given explicit consent
            hs_legal_basis: 'Freely given consent from contact',
          },
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json().catch(() => ({}));
      console.error('HubSpot contact update error:', errorData);
      return {
        success: false,
        error: `Failed to update contact marketing consent: ${updateResponse.status}`,
        contactId,
      };
    }

    return {
      success: true,
      contactId,
    };
  } catch (error) {
    console.error('Error setting marketing consent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// Listing Lookup
// ============================================================================

/**
 * Finds a Listing record in HubSpot by its external_listing_id.
 * 
 * The external_listing_id is the authoritative join key between our system
 * and HubSpot's Listings custom object. This allows us to look up listings
 * without relying on HubSpot's internal IDs, making the integration more
 * resilient to data sync issues.
 * 
 * **Data Mapping Note**: The external_listing_id corresponds to the `assetId`
 * field from source property data, NOT the `assetReferenceId` which is a
 * secondary human-facing reference. See DATA_MAPPING.md for details.
 * 
 * **IMPORTANT**: Always resolve the HubSpot Listing record ID via this function
 * before attempting any association. Do NOT use assetReferenceId or any other
 * identifier for lookups - this prevents 500 errors from invalid association calls.
 * 
 * @param externalListingId - The external listing ID to search for (maps to assetId)
 * @returns Result containing the HubSpot Listing ID if found, with notFound flag for disambiguation
 */
export async function findListingByExternalId(
  externalListingId: string
): Promise<HubSpotListingLookupResult> {
  // Guard: Validate the external listing ID format
  // assetId should be a numeric string (e.g., "22242")
  const trimmedId = externalListingId?.trim() ?? '';
  
  if (!trimmedId) {
    console.error('findListingByExternalId called with empty external_listing_id');
    return {
      success: false,
      error: 'external_listing_id is required and cannot be empty',
      notFound: false,
    };
  }
  
  // Log the lookup attempt for debugging
  console.log(`Looking up HubSpot Listing by external_listing_id (assetId): ${trimmedId}`);

  try {
    const accessToken = getAccessToken();

    // Search for the Listing object by external_listing_id
    // The Listings object is a custom object in HubSpot, so we use the
    // CRM Objects API with the object type identifier
    const listingsObjectType = process.env.HUBSPOT_LISTINGS_OBJECT_TYPE || 'listings';

    const searchResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/${listingsObjectType}/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'external_listing_id',
                  operator: 'EQ',
                  value: trimmedId,
                },
              ],
            },
          ],
          properties: ['external_listing_id', 'name'],
        }),
      }
    );

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json().catch(() => ({}));
      console.error('HubSpot listing search API error:', {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        error: errorData,
        externalListingId: trimmedId,
      });
      return {
        success: false,
        error: `HubSpot API error: ${searchResponse.status} ${searchResponse.statusText}`,
        notFound: false,
      };
    }

    const searchResult = await searchResponse.json();

    if (!searchResult.results || searchResult.results.length === 0) {
      // Listing not found - this is a valid scenario that should fail fast for associations
      console.warn(`No Listing found in HubSpot for external_listing_id (assetId): ${trimmedId}`);
      return {
        success: false,
        error: `No listing found with external_listing_id: ${trimmedId}. Ensure the Listing exists in HubSpot with this assetId.`,
        notFound: true,
      };
    }

    const listingId = searchResult.results[0].id;
    console.log(`Found HubSpot Listing: external_listing_id=${trimmedId} -> HubSpot ID=${listingId}`);

    return {
      success: true,
      listingId,
      notFound: false,
    };
  } catch (error) {
    console.error('Error finding listing by external ID:', {
      error: error instanceof Error ? error.message : error,
      externalListingId: trimmedId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      notFound: false,
    };
  }
}

// ============================================================================
// Contact-Listing Association
// ============================================================================

/**
 * Associates a Contact with a Listing in HubSpot.
 * 
 * This creates a many-to-many relationship between Contacts and Listings:
 * - One Contact can be associated with many Listings (inquired about multiple properties)
 * - Multiple Contacts can be associated with the same Listing (multiple inquiries)
 * 
 * This function does not overwrite existing associations - it only adds new ones.
 * HubSpot's Associations API is idempotent, so calling this multiple times with
 * the same contact-listing pair will not create duplicate associations.
 * 
 * **IMPORTANT**: Both contactId and listingId must be valid HubSpot record IDs.
 * Always resolve the Listing via findListingByExternalId() first to get the
 * correct HubSpot Listing ID. Using external IDs directly will cause 500 errors.
 * 
 * @param contactId - The HubSpot Contact ID (from contact lookup or consent result)
 * @param listingId - The HubSpot Listing ID (from findListingByExternalId, NOT the assetId)
 * @returns Result indicating success/failure
 */
export async function associateContactToListing(
  contactId: string,
  listingId: string
): Promise<HubSpotAssociationResult> {
  // Guard: Validate required IDs are present
  const trimmedContactId = contactId?.trim() ?? '';
  const trimmedListingId = listingId?.trim() ?? '';

  if (!trimmedContactId) {
    console.error('associateContactToListing called with empty contactId');
    return {
      success: false,
      error: 'contactId is required for association',
    };
  }

  if (!trimmedListingId) {
    console.error('associateContactToListing called with empty listingId');
    return {
      success: false,
      error: 'listingId is required for association - resolve via findListingByExternalId first',
    };
  }

  // Log the association attempt for debugging
  console.log(`Creating association: Contact ${trimmedContactId} -> Listing ${trimmedListingId}`);

  try {
    const accessToken = getAccessToken();
    const listingsObjectType = process.env.HUBSPOT_LISTINGS_OBJECT_TYPE || 'listings';

    // Use the CRM Associations API v4 to create the association
    // Using HubSpot's default association by omitting the body entirely.
    // This approach is recommended for standard object associations and avoids
    // the need to specify numeric association type IDs.
    const associationResponse = await fetch(
      `https://api.hubapi.com/crm/v4/objects/contacts/${trimmedContactId}/associations/${listingsObjectType}/${trimmedListingId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!associationResponse.ok) {
      const errorData = await associationResponse.json().catch(() => ({}));
      console.error('HubSpot association API error:', {
        status: associationResponse.status,
        statusText: associationResponse.statusText,
        error: errorData,
        contactId: trimmedContactId,
        listingId: trimmedListingId,
      });
      return {
        success: false,
        error: `HubSpot association error: ${associationResponse.status} - verify both Contact and Listing IDs are valid HubSpot record IDs`,
      };
    }

    console.log(`Successfully associated Contact ${trimmedContactId} with Listing ${trimmedListingId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error associating contact to listing:', {
      error: error instanceof Error ? error.message : error,
      contactId: trimmedContactId,
      listingId: trimmedListingId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
