'use client';

import { useEffect } from 'react';

interface HubSpotFormProps {
  portalId: string;
  formId: string;
  region?: string;
}

declare global {
  interface Window {
    hbspt: any;
  }
}

export default function HubSpotForm({ portalId, formId, region = 'na1' }: HubSpotFormProps) {
  useEffect(() => {
    // Load HubSpot form script
    const script = document.createElement('script');
    script.src = '//js.hsforms.net/forms/embed/v2.js';
    script.charset = 'utf-8';
    script.type = 'text/javascript';
    document.body.appendChild(script);

    script.onload = () => {
      if (window.hbspt) {
        window.hbspt.forms.create({
          region: region,
          portalId: portalId,
          formId: formId,
          target: `#hubspot-form-${formId}`,
          css: '',
          cssClass: 'hubspot-form-embedded',
          submitButtonClass: 'bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-semibold transition-colors cursor-pointer',
          errorClass: 'text-red-600 text-sm mt-1',
          errorMessageClass: 'text-red-600 text-sm',
          onFormReady: function($form: any) {
            // Form is ready - apply custom styling if needed
            $form.find('input[type="submit"]').addClass('bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-semibold transition-colors cursor-pointer');
          },
          onFormSubmit: function($form: any) {
            // Form submitted - track analytics if needed
            console.log('Form submitted to HubSpot sandbox');
          },
          onFormSubmitted: function($form: any) {
            // Form submission confirmed
            console.log('Form submission confirmed by HubSpot sandbox');
          }
        });
      }
    };

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [portalId, formId, region]);

  return (
    <div 
      id={`hubspot-form-${formId}`} 
      className="hubspot-form-wrapper max-w-2xl mx-auto"
    />
  );
}
