const DATABASE_NAME = "torque-local-workshop-photos";
const DATABASE_VERSION = 1;
const PHOTO_STORE = "photos";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1920;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
let databasePromise;
function openDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Este navegador não oferece armazenamento local de fotos."));
  }
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PHOTO_STORE)) {
        database.createObjectStore(PHOTO_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir as fotos."));
    request.onblocked = () =>
      reject(new Error("Feche outras abas do Torque para liberar as fotos."));
  }).catch((error) => {
    databasePromise = undefined;
    throw error;
  });
  return databasePromise;
}
function runTransaction(mode, operation) {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(PHOTO_STORE, mode);
        const request = operation(transaction.objectStore(PHOTO_STORE));
        let result;
        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () => reject(request.error ?? new Error("Falha ao acessar uma foto."));
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("Falha ao salvar no armazenamento local."));
        transaction.onabort = () =>
          reject(transaction.error ?? new Error("A operação de fotos foi cancelada."));
      }),
  );
}
async function compressPhoto(file) {
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const compressed = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    return compressed ?? file;
  } catch {
    // Keep formats the browser cannot decode as-is, for example HEIC files.
    return file;
  }
}
function createPhotoId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
export async function saveWorkOrderPhoto(file) {
  const preparedPhoto = await prepareWorkOrderPhoto(file);
  const photo = {
    id: createPhotoId(),
    blob: preparedPhoto.blob,
    filename: preparedPhoto.filename,
    createdAt: new Date().toISOString(),
  };
  await runTransaction("readwrite", (store) => store.add(photo));
  return {
    id: photo.id,
    filename: photo.filename,
    size: preparedPhoto.size,
    contentType: preparedPhoto.contentType,
  };
}
export async function prepareWorkOrderPhoto(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Cada foto precisa ter até 20 MB.");
  }
  const blob = await compressPhoto(file);
  const contentType = blob.type || file.type;
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error("Use uma foto JPEG, PNG, WebP ou HEIC.");
  }
  if (blob.size > MAX_FILE_SIZE) {
    throw new Error("A foto precisa ter até 20 MB após a compressão.");
  }
  return {
    blob,
    filename: file.name.slice(0, 255),
    contentType,
    size: blob.size,
  };
}
export async function getWorkOrderPhoto(id) {
  const photo = await runTransaction("readonly", (store) => store.get(id));
  return photo?.blob;
}
export function deleteWorkOrderPhoto(id) {
  return runTransaction("readwrite", (store) => store.delete(id));
}
export function clearWorkOrderPhotos() {
  return runTransaction("readwrite", (store) => store.clear());
}
