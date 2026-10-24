import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions } from './$types';
export const actions: Actions = {
    default: async ({ request, locals, platform }) => {
        const form = await request.formData();
        const email = String(form.get('email') || '').trim().toLowerCase();
        const password = String(form.get('password') || '');
        const owner = (env.PRIVATE_OWNER_EMAIL || platform?.env?.PRIVATE_OWNER_EMAIL || '').trim().toLowerCase();
        if (!owner || email !== owner || !password) return fail(400, { message: 'Invalid account or password.' });
        const { error } =
            await locals.supabase.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            console.error('Supabase login failed:', {
                code: error.code,
                status: error.status,
                message: error.message
            });

            return fail(400, {
                message: 'Unable to sign in. Check your credentials.'
            });
        }
        throw redirect(303, '/dashboard');
    }
};
