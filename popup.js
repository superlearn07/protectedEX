window.addEventListener('DOMContentLoaded', () => {
  console.log("✅ Popup DOM ready!");

  const noteEl = document.getElementById('note');
  const passwordEl = document.getElementById('password');
  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const statusEl = document.getElementById('status');
  const sessionOnlyEl = document.getElementById('sessionOnly');


  saveBtn.addEventListener('click', async () => {
    console.log('💾 Save clicked');
    await saveNote();
  });
  loadBtn.addEventListener('click', async () => {
    console.log('📂 Load clicked');
    await loadNote();
  });
  clearBtn.addEventListener('click', () => {
    console.log('❌ Clear clicked');
    clearNote();
  });


  async function getKeyFromPassword(password, salt) {
    const enc = new TextEncoder();
    const passwordBytes = enc.encode(password);
    const keyMaterial = await crypto.subtle.importKey(
      'raw', passwordBytes, { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function saveNote() {
    const plaintext = noteEl.value;
    const password = passwordEl.value;
    const sessionOnly = sessionOnlyEl.checked;


    if (!plaintext) {
      statusEl.textContent = '⚠️ Enter some text!';
      return;
    }
    if (!password) {
      statusEl.textContent = '⚠️ Enter a password!';
      return;
    }

    try {

      const salt = crypto.getRandomValues(new Uint8Array(16));

      const key = await getKeyFromPassword(password, salt);

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = new TextEncoder().encode(plaintext);
      const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);


      const vaultData = {
        cipher: arrayBufferToBase64(cipher),
        iv: arrayBufferToBase64(iv.buffer),
        salt: arrayBufferToBase64(salt)
      };
      if (sessionOnly) {
        sessionStorage.setItem('vault', JSON.stringify(vaultData));
        statusEl.textContent = '✅ Note saved for this session!';
      } else {
        await chrome.storage.local.set({ vault: vaultData });
        statusEl.textContent = '✅ Note saved securely!';
      }

      noteEl.value = '';
      passwordEl.value = '';
      sessionOnlyEl.checked = false;
    } catch (err) {
      console.error(err);
      statusEl.textContent = '❌ Failed to save note.';
    }
  }

  async function loadNote() {
    const password = passwordEl.value;
    const sessionOnly = sessionOnlyEl.checked;

    if (!password) {
      statusEl.textContent = '⚠️ Enter password to load!';
      return;
    }

    try {
      let vaultData;
      if (sessionOnly) {
        const raw = sessionStorage.getItem('vault');
        vaultData = raw ? JSON.parse(raw) : null;
      } else {
        const result = await chrome.storage.local.get('vault');
        vaultData = result.vault;
      }
      if (!vaultData) {
        statusEl.textContent = 'ℹ️ No note saved yet.';
        return;
      }
      const cipherBuf = base64ToArrayBuffer(vaultData.cipher);
      const ivBuf = base64ToArrayBuffer(vaultData.iv);
      const saltBuf = base64ToArrayBuffer(vaultData.salt);
      const key = await getKeyFromPassword(password, new Uint8Array(saltBuf));
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(ivBuf) },
        key,
        cipherBuf
      );
      noteEl.value = new TextDecoder().decode(plaintext);
      statusEl.textContent = '✅ Note loaded!';
    } catch (err) {
      console.error(err);
      statusEl.textContent = '❌ Failed to load—wrong password?';
      triggerShake();
    }
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function clearNote() {
    noteEl.value = '';
    passwordEl.value = '';
    statusEl.textContent = '';
  }

  function triggerShake() {
    const card = document.querySelector('.card');
    if (!card) return;
    card.classList.remove('shake');
    void card.offsetWidth; 
    card.classList.add('shake');
  }
});

  const noteEl     = document.getElementById('note');
  const passwordEl = document.getElementById('password');
  const saveBtn    = document.getElementById('saveBtn');
  const loadBtn    = document.getElementById('loadBtn');                                                                                              
  const clearBtn   = document.getElementById('clearBtn');
  const statusEl   = document.getElementById('status');
  const connectBtn = document.getElementById('connectwallet')
  let walletPubKey, walletSignature;
  const sessionOnlyEl = document.getElementById('sessionOnly');

  console.log({ noteEl, passwordEl, saveBtn, loadBtn, clearBtn, statusEl });

  saveBtn.addEventListener('click',  async () => {
    console.log('💾 Save clicked');
    await saveNote();
  });
  loadBtn.addEventListener('click',  async () => {
    console.log('📂 Load clicked');
    await loadNote();
  });
  clearBtn.addEventListener('click', () => {
    console.log('❌ Clear clicked');
    clearNote();
  });

  
  testCryptoKey();



  async function saveNote() {
  const plaintext     = noteEl.value;
  const password      = passwordEl.value;
  const sessionOnly   = sessionOnlyEl.checked;


  if (!plaintext) {
    statusEl.textContent = '⚠️ Enter some text!';
    return;
  }
  if (!password) {
    statusEl.textContent = '⚠️ Enter a password!';
    return;
  }


  try {

    const salt = crypto.getRandomValues(new Uint8Array(16));

    const signed = await window.solana.signMessage(salt, 'utf8');
    const walletSig = signed.signature; 


    const key = await getKeyFromPasswordAndWallet(password, salt, walletSig);


    const { cipher, iv } = await encryptText(plaintext, key);


    const vaultData = {
      cipher,              
      iv,                  
      salt: arrayBufferToBase64(salt), 
      walletSig: arrayBufferToBase64(walletSig) 
    };

    if (sessionOnly) {
      sessionStorage.setItem('vault', JSON.stringify(vaultData));
      statusEl.textContent = '✅ Note saved for this session!';
    } else {
      await chrome.storage.local.set({ vault: vaultData });
      statusEl.textContent = '✅ Note saved securely!';
    }


    noteEl.value     = '';
    passwordEl.value = '';
    sessionOnlyEl.checked = false;

  } catch (err) {
    console.error(err);
    statusEl.textContent = '❌ Failed to save note.';
  }
}


  async function loadNote() {
  const password    = passwordEl.value;
  const sessionOnly = sessionOnlyEl.checked;


  if (!password) {
    statusEl.textContent = '⚠️ Enter password to load!';
    return;
  }

  try {
    let vaultData;
    if (sessionOnly) {
      const raw = sessionStorage.getItem('vault');
      vaultData = raw ? JSON.parse(raw) : null;
    } else {
      const result = await chrome.storage.local.get('vault');
      vaultData = result.vault;
    }

    if (!vaultData) {
      statusEl.textContent = 'ℹ️ No note saved yet.';
      return;
    }

    const cipherBuf = base64ToArrayBuffer(vaultData.cipher);
    const ivBuf     = base64ToArrayBuffer(vaultData.iv);
    const saltBuf   = base64ToArrayBuffer(vaultData.salt);
    const sigBuf    = base64ToArrayBuffer(vaultData.walletSig);

    const key = await getKeyFromPasswordAndWallet(
      password,
      new Uint8Array(saltBuf),
      new Uint8Array(sigBuf)
    );

    const plaintext = await decryptText(cipherBuf, key, new Uint8Array(ivBuf));

    noteEl.value         = plaintext;
    statusEl.textContent = '✅ Note loaded with 2FA!';
  } catch (err) {
    console.error(err);
    statusEl.textContent = '❌ Failed to load—wrong password or wallet?';
    triggerShake();
  }
}

async function getKeyFromPasswordAndWallet(password, salt, walletSig) {
  const enc          = new TextEncoder();
  const pwBytes      = enc.encode(password);
  const keyMaterial  = await crypto.subtle.importKey(
    'raw', pwBytes,
    { name: 'PBKDF2' },
    false, ['deriveKey']
  );

  const combinedSalt = new Uint8Array(salt.length + 16);
  combinedSalt.set(salt, 0);
  combinedSalt.set(walletSig.slice(0,16), salt.length);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: combinedSalt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt','decrypt']
  );
}


  function clearNote() {
    noteEl.value     = '';
    passwordEl.value = '';
    statusEl.textContent = '';
  };

function triggerShake() {
  const card = document.querySelector('.card');
  if (!card) return;
  card.classList.remove('shake');
  void card.offsetWidth; 
  card.classList.add('shake');
}

