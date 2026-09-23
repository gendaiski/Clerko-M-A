<?php

namespace App\Console\Commands;

use App\Services\Extraction\ExtractionResult;
use App\Services\Extraction\FieldNormaliser;
use App\Services\Extraction\ProfileExtractor;
use App\Services\Extraction\ProfileMapper;
use Illuminate\Console\Command;

/**
 * Integration check for an extraction provider: sends a real Sijilat CR PDF,
 * waits for the result, and shows the raw response, the normalised keys and
 * how they map onto the company profile. Nothing is saved.
 */
class TestExtraction extends Command
{
    protected $signature = 'clerko:extraction:test
        {pdf : Path to a Sijilat CR profile PDF}
        {--driver= : xtracta, extracta, manual or fake (default: CLERKO_EXTRACTION_DRIVER)}
        {--timeout=180 : Seconds to wait for the result}
        {--raw : Print the full raw response}';

    protected $description = 'Send a CR PDF to the extraction provider and show how its result maps onto a company profile';

    public function handle(ProfileMapper $mapper, FieldNormaliser $normaliser): int
    {
        $path = $this->argument('pdf');
        if (! is_readable($path)) {
            $this->error("Cannot read {$path}.");

            return self::FAILURE;
        }

        if ($driver = $this->option('driver')) {
            config(['clerko.extraction.driver' => $driver]);
            app()->forgetInstance(ProfileExtractor::class);
        }
        $extractor = app(ProfileExtractor::class);

        $this->info("Submitting to {$extractor->name()}…");
        $reference = $extractor->submit(file_get_contents($path), basename($path));
        $this->line("Reference: <comment>{$reference}</comment>");

        $deadline = time() + (int) $this->option('timeout');
        do {
            $result = $extractor->fetch($reference);
            $this->line("Status: <comment>{$result->status}</comment>");
            if ($result->status !== ExtractionResult::PROCESSING) {
                break;
            }
            sleep(5);
        } while (time() < $deadline);

        if ($this->option('raw') || $result->status !== ExtractionResult::COMPLETED) {
            $this->newLine();
            $this->line(is_string($result->raw) ? $result->raw : json_encode($result->raw, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }

        if ($result->status !== ExtractionResult::COMPLETED) {
            $this->error($result->error ?? 'No completed result.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Normalised fields (use these names in clerko.extraction.field_map):');
        $this->table(['Key', 'Value'], collect($normaliser->normalise($result->fields))
            ->map(fn ($v, $k) => [$k, is_scalar($v) ? (string) $v : json_encode($v, JSON_UNESCAPED_UNICODE)])
            ->values()->all());

        $this->info('Company profile after mapping:');
        $this->table(['Attribute', 'Value'], collect($mapper->map($result->fields))
            ->map(fn ($v, $k) => [$k, is_scalar($v) ? (string) $v : json_encode($v, JSON_UNESCAPED_UNICODE)])
            ->values()->all());

        $missing = array_diff(array_keys(config('clerko.extraction.field_map')), array_keys($mapper->map($result->fields)));
        if ($missing) {
            $this->warn('Not found in the result: '.implode(', ', $missing));
        }
        if ($unmapped = $mapper->unmappedKeys($result->fields)) {
            $this->line('Returned but not mapped: '.implode(', ', $unmapped));
        }

        return self::SUCCESS;
    }
}
