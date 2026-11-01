'use strict';
// OAuth web client ID is public configuration, NOT a client secret.
// Browser identity is informational until the backend validates the ID token.
const KEVITU_OAUTH_CLIENT_ID='556436437882-flsu8vhvkt2cmsvbbp0nm3mtn7s0cth0.apps.googleusercontent.com';
const status=document.getElementById('login-status');
const signout=document.getElementById('signout');
let credential=null;
function displayStatus(value){status.textContent=value}
function onGoogleCredential(response){
  if(!response||typeof response.credential!=='string'){displayStatus('Google Login gagal. Cuba lagi.');return}
  // Keep short-lived token only in page memory. Do not decode or trust it as Admin authorisation.
  credential=response.credential;
  displayStatus('Google Sign-In berjaya. Menunggu pengesahan akses Admin oleh backend. Simpan mata masih dikunci.');
  signout.hidden=false;
}
signout.addEventListener('click',()=>{
  credential=null;
  if(window.google?.accounts?.id)google.accounts.id.disableAutoSelect();
  signout.hidden=true;
  displayStatus('Telah log keluar dari sesi aplikasi ini.');
});
function startGoogleSignIn(){
  if(!window.google?.accounts?.id){displayStatus('Google Sign-In gagal dimuatkan. Semak sambungan internet dan refresh.');return}
  google.accounts.id.initialize({client_id:KEVITU_OAUTH_CLIENT_ID,callback:onGoogleCredential,auto_select:false});
  google.accounts.id.renderButton(document.getElementById('google-signin'),{theme:'outline',size:'large',text:'signin_with',shape:'rectangular'});
}
window.addEventListener('load',startGoogleSignIn);
