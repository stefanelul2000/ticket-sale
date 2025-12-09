<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use OpenApi\Attributes as OA;

class UserController extends Controller
{
    #[OA\Get(
        path: '/users',
        summary: 'Get a paginated list of users',
        security: [['sanctum' => []]],
        tags: ['Users'],
        parameters: [
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number',
                required: false,
                schema: new OA\Schema(type: 'integer', default: 1)
            ),
            new OA\Parameter(
                name: 'per_page',
                in: 'query',
                description: 'Number of items per page',
                required: false,
                schema: new OA\Schema(type: 'integer', default: 50)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Successful operation',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/User')),
                        new OA\Property(property: 'links', type: 'object'),
                        new OA\Property(property: 'meta', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized (requires role:5)'),
        ]
    )]
    public function index()
    {
        return User::with('role')->orderBy('name')->paginate(50);
    }

    #[OA\Post(
        path: '/users',
        summary: 'Create a new user',
        security: [['sanctum' => []]],
        tags: ['Users'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Jane Doe', minLength: 1, maxLength: 255),
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'jane.doe@example.com', nullable: true, maxLength: 255),
                    new OA\Property(property: 'username', type: 'string', example: 'janedoe', minLength: 1, maxLength: 255),
                    new OA\Property(property: 'password', type: 'string', format: 'password', example: 'password', minLength: 8),
                    new OA\Property(property: 'role_id', type: 'integer', example: 1, description: 'ID of the role to assign to the user'),
                ],
                required: ['name', 'username', 'password', 'role_id']
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'User created successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/User')
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized (requires role:5)'),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'password' => ['required', 'string', 'min:8'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'username' => $data['username'],
            'password' => Hash::make($data['password']),
            'role_id' => $data['role_id'],
            'active' => true,
            'revenue' => 0,
            'cookie' => Str::random(64),
        ]);

        return response()->json($user, 201);
    }

    #[OA\Patch(
        path: '/users/{userId}/role',
        summary: 'Update a user\'s role',
        security: [['sanctum' => []]],
        tags: ['Users'],
        parameters: [
            new OA\Parameter(
                name: 'userId',
                in: 'path',
                description: 'ID of the user to update',
                required: true,
                schema: new OA\Schema(type: 'integer', format: 'int64', example: 1)
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'role_id', type: 'integer', example: 1, description: 'New role ID for the user'),
                ],
                required: ['role_id']
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'User role updated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/User')
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized (requires role:5, or permission denied for self-demotion/owner-change)'),
            new OA\Response(response: 404, description: 'User not found'),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
    public function updateRole(Request $request, int $userId)
    {
        $data = $request->validate([
            'role_id' => ['required', 'integer', 'exists:roles,id'],
        ]);

        $user = User::find($userId);
        if (!$user) {
            throw new NotFoundHttpException('User not found');
        }

        $actor = $request->user();

        // Block changing a site owner unless the actor is also site owner (role_id 6).
        if ($user->role_id === 6 && $actor?->role_id !== 6) {
            abort(403, 'Site owner cannot be changed.');
        }

        // Prevent an admin from demoting themselves.
        if ($actor && $actor->id === $user->id && $actor->role_id >= 5 && $data['role_id'] < $actor->role_id) {
            abort(403, 'You cannot change your own role.');
        }

        $user->update(['role_id' => $data['role_id']]);

        $this->logAdminAction($actor?->id, 'user.role.change', [
            'target_user_id' => $user->id,
            'old_role_id' => $user->getOriginal('role_id'),
            'new_role_id' => $data['role_id'],
        ]);

        return response()->json($user);
    }

    #[OA\Patch(
        path: '/users/{userId}/status',
        summary: 'Update a user\'s active status',
        security: [['sanctum' => []]],
        tags: ['Users'],
        parameters: [
            new OA\Parameter(
                name: 'userId',
                in: 'path',
                description: 'ID of the user to update',
                required: true,
                schema: new OA\Schema(type: 'integer', format: 'int64', example: 1)
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'active', type: 'boolean', example: true, description: 'New active status for the user'),
                ],
                required: ['active']
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'User status updated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/User')
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized (requires role:5)'),
            new OA\Response(response: 404, description: 'User not found'),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
    public function updateStatus(Request $request, int $userId)
    {
        $data = $request->validate([
            'active' => ['required', 'boolean'],
        ]);
        $user = User::findOrFail($userId);
        $user->update(['active' => $data['active']]);
        return response()->json($user);
    }

    #[OA\Delete(
        path: '/users/{userId}',
        summary: 'Delete a user',
        security: [['sanctum' => []]],
        tags: ['Users'],
        parameters: [
            new OA\Parameter(
                name: 'userId',
                in: 'path',
                description: 'ID of the user to delete',
                required: true,
                schema: new OA\Schema(type: 'integer', format: 'int64', example: 1)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'User deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'deleted', type: 'boolean', example: true),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized (requires role:5)'),
            new OA\Response(response: 404, description: 'User not found'),
        ]
    )]
    public function destroy(int $userId)
    {
        $user = User::findOrFail($userId);
        $user->delete();
        return response()->json(['deleted' => true]);
    }

    #[OA\Get(
        path: '/roles',
        summary: 'Get a list of all roles',
        security: [['sanctum' => []]],
        tags: ['Users'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Successful operation',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/Role')
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized (requires role:5)'),
        ]
    )]
    public function roles()
    {
        return Role::orderBy('id')->get();
    }
}
