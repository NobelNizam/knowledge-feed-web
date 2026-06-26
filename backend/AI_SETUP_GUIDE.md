# Panduan Konfigurasi AI Generator (Nvidia NIM)

Aplikasi Knowledge Feed ini menggunakan model bahasa besar (LLM) untuk menghasilkan *knowledge cards* secara otomatis ketika Anda mencapai akhir dari antrean *feed*. Generator ini telah dikonfigurasi untuk menggunakan **Nvidia NIM API**, yang menyediakan berbagai pilihan model sumber terbuka dengan performa tinggi (misalnya seri Llama-3, Mistral, dll.) melalui standar SDK OpenAI.

## Langkah 1: Dapatkan Nvidia API Key
1. Kunjungi [build.nvidia.com](https://build.nvidia.com/) dan masuk/buat akun Nvidia.
2. Jelajahi model yang tersedia (seperti `meta/llama-3.1-70b-instruct`).
3. Dapatkan API Key Anda dari halaman model tersebut atau di dashboard profil Anda (API Key ini biasanya dimulai dengan `nvapi-`).

## Langkah 2: Konfigurasi `.env`

Buka berkas `backend/.env` di editor teks Anda, dan sesuaikan variabel konfigurasi berikut:

```env
# AI Generator Settings
NVIDIA_API_KEY="masukkan_api_key_nvapi_anda_di_sini"
NVIDIA_MODEL="meta/llama-3.1-70b-instruct"
NVIDIA_API_BASE_URL="https://integrate.api.nvidia.com/v1"
```

### Penjelasan Konfigurasi
* `NVIDIA_API_KEY`: Kunci rahasia API milik Anda dari Nvidia NIM.
* `NVIDIA_MODEL`: Model yang ingin Anda gunakan. Nilai bawaannya (default) adalah `meta/llama-3.1-70b-instruct` jika Anda tidak mendefinisikannya, tapi Anda bebas menggantinya ke model lain yang didukung Nvidia NIM (seperti `mistralai/mistral-large` atau model lainnya yang terdaftar di Nvidia Build).
* `NVIDIA_API_BASE_URL`: Titik henti (endpoint) server API Nvidia. Jangan ubah ini kecuali Nvidia memberikan alamat titik henti API versi terbaru.

## Langkah 3: Terapkan Perubahan

Setelah mengubah `.env`:
1. Matikan backend server yang sedang berjalan (biasanya menggunakan kombinasi tombol `Ctrl + C` di terminal).
2. Nyalakan kembali menggunakan perintah:
   ```bash
   npm run dev
   ```

## Langkah 4: Uji Coba (Pilihan Tambahan)

Anda dapat langsung menguji coba generator melalui antarmuka web (dengan melakukan *scroll* layar penuh hingga data kosong dan memicu sistem otomatis). Selain itu, Anda juga dapat menjalankan pengujian secara manual lewat terminal di dalam *folder* `backend`:

```bash
# Men-generate 5 pengetahuan baru (knowledge cards) secara manual:
npm run generate

# Jika ingin men-generate 10 kartu sekaligus, Anda bisa memberinya parameter:
npm run generate 10
```
