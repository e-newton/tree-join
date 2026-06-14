<?php $r = match($code) {
    200 => 'okokokok',
    404 => 'missing',
    default => 'error',
};
