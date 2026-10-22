<?php

require __DIR__.'/../vendor/autoload.php';

// Feature tests refresh the whole schema. Refuse to run against anything but the dedicated
// test database, whatever the container environment says (phpunit.xml must have overridden it).
foreach (['DB_DATABASE' => 'store_testing', 'DB_CONNECTION' => 'pgsql'] as $name => $expected) {
    $actual = $_SERVER[$name] ?? $_ENV[$name] ?? getenv($name);

    if ($actual !== $expected) {
        fwrite(STDERR, "Refusing to run tests: {$name} is [{$actual}], expected [{$expected}].\n");
        exit(1);
    }
}

// Create the dedicated test database on first run (idempotent).
$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '5432';
$maintenance = new PDO(
    "pgsql:host={$host};port={$port};dbname=postgres",
    (string) getenv('DB_USERNAME'),
    (string) getenv('DB_PASSWORD'),
);

$exists = $maintenance->query("select 1 from pg_database where datname = 'store_testing'")->fetchColumn();

if (! $exists) {
    $maintenance->exec('create database store_testing');
}
