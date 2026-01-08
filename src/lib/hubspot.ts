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
 * @param externalListingId - The external listing ID to search for
 * @returns Result containing the HubSpot Listing ID if found
 */
export async function findListingByExternalId(
  externalListingId: string
): Promise<HubSpotListingLookupResult> {
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
                  value: externalListingId,
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
      console.error('HubSpot listing search error:', errorData);
      return {
        success: false,
        error: `Failed to search for listing: ${searchResponse.status}`,
      };
    }

    const searchResult = await searchResponse.json();

    if (!searchResult.results || searchResult.results.length === 0) {
      // Listing not found - this is logged but handled gracefully
      console.warn('Listing not found for external_listing_id:', externalListingId);
      return {
        success: false,
        error: `No listing found with external_listing_id: ${externalListingId}`,
      };
    }

    return {
      success: true,
      listingId: searchResult.results[0].id,
    };
  } catch (error) {
    console.error('Error finding listing by external ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
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
 * @param contactId - The HubSpot Contact ID
 * @param listingId - The HubSpot Listing ID
 * @returns Result indicating success/failure
 */
export async function associateContactToListing(
  contactId: string,
  listingId: string
): Promise<HubSpotAssociationResult> {
  try {
    const accessToken = getAccessToken();
    const listingsObjectType = process.env.HUBSPOT_LISTINGS_OBJECT_TYPE || 'listings';

    // Use the CRM Associations API v4 to create the association
    // Using HubSpot's default association by omitting the body entirely.
    // This approach is recommended for standard object associations and avoids
    // the need to specify numeric association type IDs.
    const associationResponse = await fetch(
      `https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/${listingsObjectType}/${listingId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!associationResponse.ok) {
      const errorData = await associationResponse.json().catch(() => ({}));
      console.error('HubSpot association error:', errorData);
      return {
        success: false,
        error: `Failed to create association: ${associationResponse.status}`,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error associating contact to listing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
