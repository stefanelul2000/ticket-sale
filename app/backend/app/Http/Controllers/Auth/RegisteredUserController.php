<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class RegisteredUserController extends Controller
{
    /**
     * Handle an incoming registration request.
     */
    public function store(Request $request): Response
    {
        // Staff accounts are created by admins; public sign-up is off unless explicitly enabled.
        abort_unless((bool) config('app.registration_enabled'), 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:' . User::class],
            'username' => ['required', 'string', 'max:255', 'unique:' . User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'username' => $validated['username'],
            'password' => Hash::make($validated['password']),
            'role_id' => 3, // default to Seller; admin can promote/approve
            'revenue' => 0,
            'cookie' => bin2hex(random_bytes(16)),
            'active' => false, // require admin approval
        ]);

        event(new Registered($user));

        return response()->noContent(); // do not auto-login; wait for admin approval
    }
}
