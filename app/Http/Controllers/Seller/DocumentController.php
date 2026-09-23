<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Listing;
use App\Models\ListingDocument;
use App\Services\Audit\AuditLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function __construct(private readonly AuditLog $audit) {}

    public function store(Request $request, Listing $listing): RedirectResponse
    {
        Gate::authorize('manage', $listing);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'category' => ['required', Rule::in(array_keys(Listing::DOCUMENT_CATEGORIES))],
            'visibility' => ['required', Rule::in([ListingDocument::VISIBILITY_PACK, ListingDocument::VISIBILITY_STAGED])],
            'file' => ['required', 'file', 'mimes:pdf,xlsx,xls,csv,docx,doc,pptx,jpg,jpeg,png', 'max:'.config('clerko.documents.max_upload_kb')],
        ]);

        $document = $this->storeDocument($request, $listing, $data);

        $this->audit->record('listing.document_uploaded', $document, $request->user(),
            ['title' => $document->title, 'visibility' => $document->visibility], listingId: $listing->id);

        return back()->with('success', 'Document uploaded.');
    }

    public function show(Listing $listing, ListingDocument $document): StreamedResponse
    {
        Gate::authorize('manage', $listing);
        abort_unless($document->listing_id === $listing->id, 404);

        return Storage::disk(config('clerko.documents.disk'))->response($document->path, $document->original_name);
    }

    public function destroy(Request $request, Listing $listing, ListingDocument $document): RedirectResponse
    {
        Gate::authorize('manage', $listing);
        abort_unless($document->listing_id === $listing->id, 404);
        abort_if($document->accessLogs()->exists(), 409, 'A document that buyers have already accessed cannot be deleted.');

        Storage::disk(config('clerko.documents.disk'))->delete($document->path);
        $document->delete();
        $this->audit->record('listing.document_deleted', null, $request->user(), ['title' => $document->title], listingId: $listing->id);

        return back()->with('success', 'Document removed.');
    }

    /**
     * @param  array{title: string, category: string, visibility: string}  $data
     */
    public static function storeDocument(Request $request, Listing $listing, array $data): ListingDocument
    {
        $file = $request->file('file');

        return ListingDocument::create([
            'listing_id' => $listing->id,
            'uploaded_by' => $request->user()->id,
            'title' => $data['title'],
            'category' => $data['category'],
            'visibility' => $data['visibility'],
            'path' => $file->store("listings/{$listing->id}", config('clerko.documents.disk')),
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
            'size' => $file->getSize(),
            'sha256' => hash_file('sha256', $file->getRealPath()),
        ]);
    }
}
