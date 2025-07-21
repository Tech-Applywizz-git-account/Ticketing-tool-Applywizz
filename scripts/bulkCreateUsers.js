import fs from 'fs';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: { autoRefreshToken: false, persistSession: false }
    }
);


const csv = fs.readFileSync('./users.csv', 'utf8');
const { data } = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
});

(async () => {
    for (const row of data) {
        const name = row.name?.trim();
        const email = row.email?.trim().toLowerCase();
        const password = row.password?.trim();
        const role = row.role?.trim();
        const department = row.department?.trim();

        // Skip if missing required fields
        if (!name || !email || !password || !role) {
            console.warn(`⚠️ Skipping invalid row: ${JSON.stringify(row)}`);
            continue;
        }

        try {
            // Create user in Supabase Auth
            const { data: user, error } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // send invite email
            });

            if (error) {
                if (error.message.includes('already been registered')) {
                    console.error(`❌ Error creating ${email}: Already registered`);
                } else {
                    console.error(`❌ Error creating ${email}: ${error.message}`);
                }
                continue;
            }

            console.log(`✅ Created user ${email}`);

            // Insert into your custom 'users' table
            const { error: userInsertError } = await supabase.from('users').insert({
                id: user.user.id, // must match auth.users.id
                name,
                email,
                role,
                department,
                is_active: true,
            });

            if (userInsertError) {
                console.error(`❌ Error inserting into users table for ${email}`);
                console.error(userInsertError);
            }

            // Send invitation
            // const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
            // if (inviteError) {
            //     console.warn(`📩 Invite failed for ${email}: ${inviteError.message}`);
            // } else {
            //     console.log(`📧 Invite sent to ${email}`);
            // }
        } catch (err) {
            console.error(`❌ Unexpected error for ${email}:`, err);
        }
    }

    console.log('🎉 Done processing users!');
})();



// const csv = fs.readFileSync('./users.csv', 'utf8');
// const users = Papa.parse(csv, { header: true }).data;

// (async () => {
//     for (const user of users) {
//         try {
//             // 1. Create user with email + password
//             const { data, error } = await supabase.auth.admin.createUser({
//                 email: user.email,
//                 password: user.password,
//                 email_confirm: false,
//                 isActive: true,
//                 name: user.name,
//                 role: user.role,
//                 department: user.department
//             });

//             if (error) {
//                 console.error(`❌ Error creating ${user.email}: ${error.message}`);
//                 continue;
//             }

//             console.log(`✅ Created user ${user.email}`);

//             // 2. Send them an invite email
//             const invite = await supabase.auth.admin.inviteUserByEmail(user.email, {
//                 redirectTo: `https://ticketingtoolapplywizz.vercel.app/EmailVerifyRedirect?email=${encodeURIComponent(user.email)}`
//             });

//             if (invite.error) {
//                 console.error(`⚠️ Invite failed for ${user.email}: ${invite.error.message}`);
//             } else {
//                 console.log(`📧 Invite sent to ${user.email}`);
//             }
//         } catch (err) {
//             console.error(`🔥 Unexpected error for ${user.email}: ${err.message}`);
//         }
//     }
// })();
