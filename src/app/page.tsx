import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import HubApp from './HubApp'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true })

  return <HubApp initialTasks={tasks || []} userEmail={user.email || ''} />
}
