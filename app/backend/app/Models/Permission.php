<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'Permission',
    title: 'Permission',
    description: 'Permission model',
    properties: [
        new OA\Property(property: 'id', type: 'integer', format: 'int64', example: 1),
        new OA\Property(property: 'key', type: 'string', example: 'manage.users'),
        new OA\Property(property: 'name', type: 'string', example: 'Manage Users'),
        new OA\Property(property: 'description', type: 'string', example: 'Ability to create and update users and roles'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
    ],
    required: ['id', 'key', 'name']
)]
class Permission extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'name',
        'description',
    ];

    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }
}
