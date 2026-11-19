import { redirect } from 'next/navigation';

// Short link for posters and posts: qor.unkad.com/maqan
export default function MaqanRedirect() {
  redirect('/ereyada?v=maqan');
}
