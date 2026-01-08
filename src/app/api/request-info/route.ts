/**
 * Request Info API Endpoint
 * 
 * This server-side API endpoint handles "Request Info" form submissions from
 * listing detail pages. It implements a complete HubSpot integration workflow:
 * 
 * 1. Validates required form fields
 * 2. Creates/updates a Contact in HubSpot via Forms API
 * 3. Marks the Contact as marketing-eligible (when opted in)
 * 4. Looks up the Listing record by external_listing_id
 * 5. Associates the Contact with the Listing
 * 
 * All HubSpot identifiers are read from environment variables to keep the
 * codebase safe for public repositories.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  submitContactToHubSpot,
  setMarketingConsent,
  findListingByExternalId,
  associateContactToListing,
  RequestInfoFormData,
} from '@/lib/hubspot';

// ============================================================================
// Types
// ============================================================================

interface RequestInfoPayload {
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  external_listing_id: string;
  marketing_opt_in: boolean;
  pageUri?: string;
  pageName?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  errors?: ValidationError[];
  details?: {
    contactSubmitted: boolean;
    marketingConsentSet: boolean;
    listingFound: boolean;
    associationCreated: boolean;
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates the request payload to ensure all required fields are present
 * and correctly formatted.
 * 
 * Required fields:
 * - email: Must be a valid email address
 * - external_listing_id: Must be provided
 * - marketing_opt_in: Must be explicitly true (user must consent)
 */
function validatePayload(payload: unknown): { valid: true; data: RequestInfoPayload } | { valid: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  if (!payload || typeof payload !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'body', message: 'Request body must be a JSON object' }],
    };
  }

  const data = payload as Record<string, unknown>;

  // Validate email (required)
  if (!data.email || typeof data.email !== 'string' || data.email.trim() === '') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.push({ field: 'email', message: 'Email must be a valid email address' });
  }

  // Validate external_listing_id (required)
  if (!data.external_listing_id || typeof data.external_listing_id !== 'string' || data.external_listing_id.trim() === '') {
    errors.push({ field: 'external_listing_id', message: 'External listing ID is required' });
  }

  // Validate marketing_opt_in (must be explicitly true)
  if (data.marketing_opt_in !== true) {
    errors.push({ 
      field: 'marketing_opt_in', 
      message: 'You must agree to receive marketing communications to submit this form.' 
    });
  }

  // Validate firstname (required for HubSpot)
  if (!data.firstname || typeof data.firstname !== 'string' || data.firstname.trim() === '') {
    errors.push({ field: 'firstname', message: 'First name is required' });
  }

  // Validate lastname (required for HubSpot)
  if (!data.lastname || typeof data.lastname !== 'string' || data.lastname.trim() === '') {
    errors.push({ field: 'lastname', message: 'Last name is required' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Return sanitized data
  return {
    valid: true,
    data: {
      firstname: (data.firstname as string).trim(),
      lastname: (data.lastname as string).trim(),
      email: (data.email as string).trim().toLowerCase(),
      phone: typeof data.phone === 'string' ? data.phone.trim() : undefined,
      external_listing_id: (data.external_listing_id as string).trim(),
      marketing_opt_in: true,
      pageUri: typeof data.pageUri === 'string' ? data.pageUri : undefined,
      pageName: typeof data.pageName === 'string' ? data.pageName : undefined,
    },
  };
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // Parse the request body
    const body = await request.json().catch(() => null);
    
    // Validate the payload
    const validation = validatePayload(body);
    
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const formData: RequestInfoFormData = validation.data;

    // Track the status of each step for detailed response
    const details = {
      contactSubmitted: false,
      marketingConsentSet: false,
      listingFound: false,
      associationCreated: false,
    };

    // Step 1: Submit contact to HubSpot Forms API
    // This will create a new contact or update an existing one (email-based dedupe)
    const contactResult = await submitContactToHubSpot(formData);
    
    if (!contactResult.success) {
      console.error('Failed to submit contact to HubSpot:', contactResult.error);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to submit contact information to HubSpot',
          details,
        },
        { status: 500 }
      );
    }
    
    details.contactSubmitted = true;

    // Step 2: Set marketing consent for the contact
    // We wait a brief moment to allow HubSpot to process the form submission
    // before trying to update the contact's marketing consent.
    // The delay is configurable via environment variable (default: 1000ms).
    const consentDelayMs = parseInt(process.env.HUBSPOT_CONSENT_DELAY_MS || '1000', 10);
    if (consentDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, consentDelayMs));
    }
    
    const consentResult = await setMarketingConsent(formData.email);
    
    if (!consentResult.success) {
      // Log the error but don't fail the entire request
      // The contact was still created successfully
      console.warn('Failed to set marketing consent:', consentResult.error);
    } else {
      details.marketingConsentSet = true;
    }

    // Step 3: Look up the Listing by external_listing_id (which maps to assetId)
    // IMPORTANT: This lookup resolves the external ID to a HubSpot record ID.
    // The external_listing_id must be the assetId from source data, NOT assetReferenceId.
    // See DATA_MAPPING.md for identifier documentation.
    console.log(`Looking up Listing for external_listing_id (assetId): ${formData.external_listing_id}`);
    const listingResult = await findListingByExternalId(formData.external_listing_id);
    
    if (!listingResult.success) {
      // Fail fast: Do not attempt association if Listing lookup failed
      // This prevents 500 errors from invalid association calls
      const baseMessage = 'Contact created successfully, but listing not found for association';
      const detailMessage = listingResult.notFound
        ? `Listing not found in HubSpot for external_listing_id (assetId): ${formData.external_listing_id}. Ensure the Listing exists with this ID.`
        : `Failed to look up Listing: ${listingResult.error}`;
      
      console.warn('Listing lookup failed - skipping association:', {
        external_listing_id: formData.external_listing_id,
        notFound: listingResult.notFound,
        error: listingResult.error,
      });
      
      return NextResponse.json(
        {
          success: true,
          message: `${baseMessage}. ${detailMessage}`,
          details,
        },
        { status: 200 }
      );
    }
    
    details.listingFound = true;
    console.log(`Listing found: external_listing_id=${formData.external_listing_id} -> HubSpot ID=${listingResult.listingId}`);

    // Step 4: Associate the Contact with the Listing
    // We use the HubSpot Listing ID from the lookup result (NOT the external_listing_id)
    // This is critical: the association API requires HubSpot record IDs, not external IDs
    if (consentResult.contactId && listingResult.listingId) {
      console.log(`Creating Contact-Listing association: Contact=${consentResult.contactId}, Listing=${listingResult.listingId}`);
      const associationResult = await associateContactToListing(
        consentResult.contactId,
        listingResult.listingId
      );
      
      if (!associationResult.success) {
        // Log the error but don't fail the request - contact was still created
        console.warn('Failed to create Contact-Listing association:', {
          contactId: consentResult.contactId,
          listingId: listingResult.listingId,
          error: associationResult.error,
        });
      } else {
        details.associationCreated = true;
        console.log('Contact-Listing association created successfully');
      }
    } else {
      console.warn('Cannot create association: missing contactId or listingId', {
        contactId: consentResult.contactId,
        listingId: listingResult.listingId,
      });
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Request submitted successfully',
        details,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in request-info API:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET(): Promise<NextResponse<ApiResponse>> {
  return NextResponse.json(
    {
      success: false,
      message: 'Method not allowed. Use POST to submit form data.',
    },
    { status: 405 }
  );
}
