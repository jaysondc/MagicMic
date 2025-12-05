import { synchronize } from '@nozbe/watermelondb/sync'
import { database } from './index'
import { supabase } from '../lib/supabase'

export async function sync() {
    await synchronize({
        database,
        pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
            const { data, error } = await supabase.rpc('pull_changes', {
                last_pulled_at: lastPulledAt,
                schema_version: schemaVersion,
            })

            if (error) {
                throw new Error(error.message)
            }

            const { changes, timestamp } = data
            return { changes, timestamp }
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
            const { error } = await supabase.rpc('push_changes', {
                changes,
                last_pulled_at: lastPulledAt,
            })

            if (error) {
                throw new Error(error.message)
            }
        },
        migrationsEnabledAtVersion: 1,
    })
}
