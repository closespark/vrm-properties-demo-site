# HubSpot Integration Guide

This demo site includes HubSpot sandbox tracking, forms, and CTAs for marketing campaign demonstrations.

## External Form Integration

All forms on this site use **HubSpot's external form embed** approach, which means:
- Forms submit directly to your HubSpot sandbox instance
- Lead data is captured in real-time in HubSpot
- Marketing automation workflows can be triggered immediately
- No server-side proxy or API keys required
- Forms work with HubSpot's GDPR and consent features

## Configuration Required

To activate the HubSpot features, you need to update the following files with your HubSpot sandbox credentials:

### 1. Tracking Code

**File:** `src/app/layout.tsx`

Replace `YOUR_HUBSPOT_ID` with your HubSpot portal ID:

```typescript
<script
  type="text/javascript"
  id="hs-script-loader"
  async
  defer
  src="//js.hs-scripts.com/YOUR_HUBSPOT_ID.js"
></script>
```

### 2. External Forms

All forms use the HubSpot Forms Embed API which submits data directly to your HubSpot sandbox.

**Files and Form Types:**
- `src/app/page.tsx` - Homepage contact form (general inquiries)
- `src/app/properties/[id]/page.tsx` - Property inquiry form
- `src/app/agents/page.tsx` - Agent registration form
- `src/app/financing/page.tsx` - VA Vendee financing application form

Replace the placeholder values:

**Homepage Contact Form:**
```typescript
<HubSpotForm 
  portalId="YOUR_PORTAL_ID" 
  formId="YOUR_FORM_ID"
  region="na1"  // Change if using EU or other datacenter
/>
```

**Property Inquiry Form:**
```typescript
<HubSpotForm 
  portalId="YOUR_PORTAL_ID" 
  formId="YOUR_PROPERTY_INQUIRY_FORM_ID"
/>
```

**Agent Registration Form:**
```typescript
<HubSpotForm 
  portalId="YOUR_PORTAL_ID" 
  formId="YOUR_AGENT_REGISTRATION_FORM_ID"
/>
```

**VA Financing Application Form:**
```typescript
<HubSpotForm 
  portalId="YOUR_PORTAL_ID" 
  formId="YOUR_VA_FINANCING_FORM_ID"
/>
```

### 3. CTAs (Call-to-Actions)

**File:** `src/app/properties/[id]/page.tsx`

Replace the placeholder values in property detail pages:

```typescript
<HubSpotCTA 
  ctaId="YOUR_CTA_ID" 
  portalId="YOUR_PORTAL_ID"
/>
```

## Creating HubSpot Assets

### Setting Up External Forms in HubSpot Sandbox

1. Log into your HubSpot sandbox account
2. Navigate to Marketing → Lead Capture → Forms
3. Create forms for each page type:
   - **General Contact Form** - For homepage (name, email, phone, message)
   - **Property Inquiry Form** - For property detail pages (name, email, property interest, message)
   - **Agent Registration Form** - For `/agents` page (name, email, phone, license #, broker info)
   - **VA Financing Application** - For `/financing` page (name, email, phone, property interest, loan amount)

4. For each form:
   - Click on the form you created
   - Click "Share" or "Embed" button
   - Select "Embed code"
   - Find the Form ID in the embed code (looks like: `formId: "abc123-def456-ghi789"`)
   - Copy the Form ID
   - Update the corresponding page component with the Form ID

5. Optional: Configure form options:
   - Enable GDPR consent features
   - Set up form notifications
   - Configure thank you message or redirect
   - Add hidden fields for tracking

### Region Configuration

If your HubSpot sandbox is in a different data center (EU, etc.), update the `region` parameter:

```typescript
<HubSpotForm 
  portalId="YOUR_PORTAL_ID" 
  formId="YOUR_FORM_ID"
  region="eu1"  // or "na1" for North America (default)
/>
```

Available regions:
- `na1` - North America (default)
- `eu1` - Europe
- `ap1` - Asia Pacific

### Setting Up CTAs

1. In HubSpot, navigate to Marketing → Lead Capture → CTAs
2. Create a new CTA (e.g., "Schedule Property Tour", "Request More Info")
3. Customize the button text, style, and behavior
4. Copy the CTA ID from the embed code
5. Update the HubSpotCTA component with the CTA ID

### Getting Your Portal ID

1. In HubSpot, click on your account name in the top right
2. Go to Account & Billing
3. Your Hub ID (Portal ID) is displayed at the top

## Testing External Form Submissions

After updating the configuration:

1. Start the development server: `npm run dev`
2. Open browser developer tools
3. Check the Network tab for HubSpot script loads:
   - Look for `js.hsforms.net/forms/embed/v2.js`
   - Verify `js.hs-scripts.com/{YOUR_PORTAL_ID}.js` loads
4. Verify forms render correctly on each page:
   - Homepage: General contact form
   - Property detail pages: Property inquiry form
   - `/agents`: Agent registration form
   - `/financing`: VA financing application form
5. Test form submissions:
   - Fill out and submit a form
   - Check the browser console for confirmation messages
   - Verify the submission appears in HubSpot (Contacts → Forms)
   - Confirm contact is created with form field data

## Form Submission Flow

When a user submits a form:

1. **Form Validation**: HubSpot validates required fields client-side
2. **Direct Submission**: Form data submits directly to HubSpot sandbox via AJAX
3. **Lead Creation**: HubSpot creates or updates contact record in real-time
4. **Workflow Triggers**: Any marketing automation workflows are triggered immediately
5. **Confirmation**: User sees thank you message or is redirected
6. **Analytics**: Submission is tracked in HubSpot analytics and reports

## Campaign Tracking

The HubSpot tracking code will automatically:
- Track page views across all pages (homepage, properties, agents, financing)
- Identify visitors and create anonymous contacts
- Track form submissions from all 4 forms
- Enable marketing automation triggers based on form submissions
- Support A/B testing and personalization
- Track property views for lead scoring (which properties generate most interest)
- Enable retargeting campaigns based on visitor behavior

## Marketing Automation Examples

With these external forms, you can create workflows like:

1. **New Property Inquiry**: 
   - Trigger: Property inquiry form submitted
   - Action: Send automated email with property details
   - Action: Notify sales team
   - Action: Add to "Hot Leads" list

2. **Agent Registration**:
   - Trigger: Agent registration form submitted
   - Action: Send welcome email with portal access
   - Action: Enroll in agent training email sequence
   - Action: Assign to agent success manager

3. **VA Financing Application**:
   - Trigger: VA financing form submitted
   - Action: Send financing guide PDF
   - Action: Schedule follow-up call task
   - Action: Add to "VA Loan Prospects" list

4. **Lead Nurturing**:
   - Trigger: Contact form submitted but no follow-up
   - Action: Wait 3 days, send property recommendations
   - Action: Wait 7 days, send success stories
   - Action: Wait 14 days, send limited time offer

## Demo Scenarios

This site is configured to demonstrate:

1. **Lead Capture**: Contact forms on homepage and property pages
2. **Property Interest**: CTAs on individual listing pages
3. **Campaign Attribution**: Track which properties generate most interest
4. **Visitor Behavior**: See how users navigate between properties
5. **Conversion Optimization**: Test different CTAs and form placements
