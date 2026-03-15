import { supabase } from '../lib/supabase'

export default function Login() {
  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1>Planeja Viagem</h1>
      <button onClick={handleGoogleLogin}>Entrar com Google</button>
    </div>
  )
}
