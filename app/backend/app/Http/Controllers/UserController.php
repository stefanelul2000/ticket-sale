<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class UserController extends Controller
{
    public function index()
    {
        return User::with('role')->orderBy('name')->paginate(50);
    }

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

    public function updateStatus(Request $request, int $userId)
    {
        $data = $request->validate([
            'active' => ['required', 'boolean'],
        ]);
        $user = User::findOrFail($userId);
        $user->update(['active' => $data['active']]);
        return response()->json($user);
    }

    public function destroy(int $userId)
    {
        $user = User::findOrFail($userId);
        $user->delete();
        return response()->json(['deleted' => true]);
    }

    public function roles()
    {
        return Role::orderBy('id')->get();
    }
}
