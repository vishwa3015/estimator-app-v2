import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import DOMPurify from "npm:dompurify@3.1.0";

// Initialize Resend client from environment variables
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendEstimateRequest {
  contactEmail: string;
  contactName?: string;
  opportunityId: string;
  pdfUrl: string;
  subject?: string;
  estimateId?: string;
  contact?: {
    id?: string;
    locationId?: string;
    fullNameLowerCase?: string;
    address1?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  estimateData: {
    formValues: Record<string, Record<string, unknown>>;
    sectionUpdates: Record<string, unknown>[];
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      contactEmail,
      contactName,
      opportunityId,
      pdfUrl,
      subject,
      contact,
      estimateData,
      estimateId
    }: SendEstimateRequest = await req.json();

    if (!contactEmail || !pdfUrl) {
      throw new Error("Missing required fields: contactEmail and pdfUrl");
    }

    // --- DELETED ---
    // We no longer fetch the PDF here. This was causing the CPU timeout.
    // const pdfResponse = await fetch(pdfUrl);
    //
    // if (!pdfResponse.ok) {
    //   throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
    // }
    //
    // const pdfBuffer = await pdfResponse.arrayBuffer();
    // --- END DELETED ---

    console.log(`Attempting to send email to: ${contactEmail} for opportunity: ${opportunityId}`);

    // Sanitize all user-provided content to prevent XSS
    const sanitize = (html: string) => DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href']
    });

    // Sanitize email subject to prevent header injection
    const sanitizeSubject = (subject?: string): string => {
      if (!subject) return 'Your Estimate';

      // Strip all newline characters (CRLF injection prevention)
      let sanitized = subject.replace(/[\r\n]/g, '');

      // Limit length to prevent abuse
      if (sanitized.length > 200) {
        sanitized = sanitized.substring(0, 200);
      }

      // Remove any null bytes
      sanitized = sanitized.replace(/\0/g, '');

      return sanitized.trim() || 'Your Estimate';
    };

    const safeContactName = contactName ? sanitize(contactName) : '';
    const safeFullName = contact?.fullNameLowerCase ? sanitize(contact.fullNameLowerCase) : '';
    const safeAddress1 = contact?.address1 ? sanitize(contact.address1) : '';
    const safeCity = contact?.city ? sanitize(contact.city) : '';
    const safeState = contact?.state ? sanitize(contact.state) : '';
    const safeCountry = contact?.country ? sanitize(contact.country) : '';

    // Send the email using Resend
    const { data: emailResponse, error: emailError } = await resend.emails.send({
      from: "Estimates <onboarding@resend.dev>", // Replace with your "from" email
      to: contactEmail,
      subject: sanitizeSubject(subject),
      html: `
        <h1>Your Estimate is Ready${safeContactName ? `, ${safeContactName}` : ''}!</h1>
        <p>Please find your estimate attached to this email.</p>
        <p>This estimate is for contact: <strong>${safeFullName}</strong></p>
        ${safeAddress1 ? `<p>Address: <strong>${safeAddress1} ${safeCity} ${safeState} ${safeCountry}</strong></p>` : ''}
        <p><a href="https://app.smartroofing.ai/v2/location/${contact?.locationId}/contacts/detail/${contact?.id}">Click here</a> to get full details of this contact.</p>
        <p>Please review the attached document and let us know if you have any questions.</p>
        <br>
        <p>To review this estimate, please <a href="https://estimatetracker.tool.smartroofing.ai/estimate-action/${estimateId}">click here</a></p>
        <br>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>Your Estimates Team</p>
        <img height="70px" src="https://msgsndr-private.storage.googleapis.com/companyPhotos/60946cdd-aaf9-4805-b736-d24093a8a38f.PNG" />
      `,
      attachments: [
        {
          filename: `estimate-${opportunityId}.pdf`,

          // --- CHANGED ---
          // Use the 'path' property to have Resend fetch the file from the public URL.
          // This avoids loading the file into memory in your Edge Function.
          path: pdfUrl,

          // --- DELETED ---
          // content: new Uint8Array(pdfBuffer),
        },
      ],
    });

    // Handle any errors from Resend
    if (emailError) {
      console.error("Resend API Error:", emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResponse?.id,
      message: "Estimate sent successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Error in send-estimate function:", err.message, err.stack);
    return new Response(
      JSON.stringify({
        error: err.message,
        success: false
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

// Start the Deno server
serve(handler);