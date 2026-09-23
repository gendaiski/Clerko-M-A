<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();

        // Page components live in resources/js/pages (lower-case).
        config(['inertia.testing.page_paths' => [resource_path('js/pages')]]);
    }
}
