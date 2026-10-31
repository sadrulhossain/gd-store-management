<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class ProductCatalogueSeeder extends Seeder
{
    public function run(): void
    {

    }

    private function units(): array
    {
        return [
            $this->setUnit('Kg'),
            $this->setUnit('gm', false),
            $this->setUnit('Sac', false),
            $this->setUnit('Ltr'),
            $this->setUnit('ml', false),
            $this->setUnit('Pc', false),
            $this->setUnit('Dz'),
            $this->setUnit('Kg'),
            $this->setUnit('Kg'),
            $this->setUnit('Kg'),
        ];
    }

    private function setUnit(string $title, bool $allowDecimal = true): array
    {
        return [
            'title' => $title,
            'allow_decimal' => $allowDecimal,
        ];
    }
}
