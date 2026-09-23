<?php

namespace App\Services\Nda;

use App\Models\Listing;
use App\Models\User;

/**
 * The platform NDA a buyer signs before a company's identity is revealed.
 * The same clauses are shown on screen, hashed, and rendered into the signed
 * PDF, so the signed record always matches what the buyer read.
 *
 * NOTE: template wording for legal review before launch.
 */
class NdaTemplate
{
    /**
     * @return array{title: string, version: string, clauses: array<int, array{heading: string, body: string}>}
     */
    public function render(Listing $listing, User $buyer): array
    {
        $ref = $listing->reference;

        return [
            'title' => 'Non-Disclosure Agreement — Listing '.$ref,
            'version' => config('clerko.nda.version'),
            'clauses' => [
                ['heading' => 'Parties', 'body' => "This Agreement is made between the registered Clerko M&A user signing below (the \"Recipient\") and the owner(s) of the business advertised on Clerko M&A under listing reference {$ref} (the \"Discloser\"), and is administered through the Clerko M&A platform (\"Clerko\")."],
                ['heading' => 'Purpose', 'body' => 'The Recipient wishes to evaluate a possible acquisition of, or investment in, the business (the "Purpose"). Confidential Information is disclosed solely for the Purpose.'],
                ['heading' => 'Confidential Information', 'body' => 'Confidential Information means the identity of the business and its owners, and all financial, commercial, legal, technical and personal information disclosed through Clerko in connection with the listing, in any form, together with any notes or analyses prepared from it. It excludes information that is or becomes public other than through a breach of this Agreement, or that the Recipient lawfully held before disclosure without a duty of confidence.'],
                ['heading' => 'Obligations', 'body' => 'The Recipient shall (a) keep the Confidential Information strictly confidential; (b) use it only for the Purpose; (c) disclose it only to its professional advisers and financiers who need to know it for the Purpose and who are bound by equivalent duties of confidence, remaining responsible for their compliance; and (d) not copy, distribute or publish it except as required for the Purpose.'],
                ['heading' => 'No contact outside the platform', 'body' => 'Until a transaction completes or the Recipient withdraws, the Recipient shall communicate with the Discloser about the business only through Clerko, and shall not approach the business, its owners, employees, customers or suppliers directly, nor seek to complete a transaction in a way that circumvents Clerko.'],
                ['heading' => 'Non-solicitation', 'body' => 'For 12 months from signature the Recipient shall not solicit or employ any employee of the business with whom it had contact, or of whom it became aware, through the Purpose, save through general advertisement.'],
                ['heading' => 'Monitoring', 'body' => 'The Recipient acknowledges that documents made available through Clerko are watermarked to its account and that every access is logged, and consents to that processing of its personal data for compliance purposes.'],
                ['heading' => 'Return and destruction', 'body' => 'On request, or on ceasing to pursue the Purpose, the Recipient shall destroy or return all Confidential Information, save for copies it must retain by law, which remain subject to this Agreement.'],
                ['heading' => 'Term', 'body' => 'The obligations in this Agreement continue for two (2) years from the date of signature, or until completion of a transaction between the parties, whichever is earlier.'],
                ['heading' => 'No obligation', 'body' => 'Nothing in this Agreement obliges either party to enter into any transaction, and no representation or warranty is given as to the accuracy or completeness of the Confidential Information.'],
                ['heading' => 'Governing law', 'body' => 'This Agreement is governed by the laws of the Kingdom of Bahrain, and the courts of the Kingdom of Bahrain have exclusive jurisdiction over any dispute arising from it.'],
                ['heading' => 'Electronic signature', 'body' => 'The Recipient agrees that typing its full legal name and confirming below constitutes its electronic signature and that this Agreement is binding in electronic form.'],
            ],
        ];
    }

    /**
     * @param  array{title: string, version: string, clauses: array<int, array{heading: string, body: string}>}  $nda
     */
    public function hash(array $nda): string
    {
        return hash('sha256', json_encode($nda, JSON_UNESCAPED_UNICODE));
    }
}
