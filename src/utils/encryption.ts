export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKey = await window.crypto.subtle.exportKey(
    "jwk",
    keyPair.publicKey
  );
  const privateKey = await window.crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey
  );

  return { publicKey, privateKey };
}

export async function encryptMessage(message: string, publicKey: JsonWebKey) {
  const importedPublicKey = await window.crypto.subtle.importKey(
    "jwk",
    publicKey,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );

  const encodedMessage = new TextEncoder().encode(message);
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    importedPublicKey,
    encodedMessage
  );

  return btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
}

export async function decryptMessage(
  encryptedMessage: string,
  privateKey: JsonWebKey
) {
  const importedPrivateKey = await window.crypto.subtle.importKey(
    "jwk",
    privateKey,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );

  const encryptedData = Uint8Array.from(atob(encryptedMessage), (c) =>
    c.charCodeAt(0)
  );
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    importedPrivateKey,
    encryptedData
  );

  return new TextDecoder().decode(decryptedData);
}
