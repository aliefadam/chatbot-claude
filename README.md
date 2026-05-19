# Claude Desktop

Aplikasi desktop untuk berinteraksi dengan Claude AI menggunakan API adaCode.

## Fitur

✅ **Chat Interface** - Interface yang modern dan mudah digunakan  
✅ **History Management** - Semua percakapan tersimpan otomatis  
✅ **File Attachments** - Upload gambar dan file  
✅ **Multi-conversation** - Kelola banyak percakapan sekaligus  
✅ **Dark Theme** - Interface yang nyaman untuk mata  
✅ **Auto-save** - History tersimpan otomatis  

## Instalasi

### 1. Install Dependencies

```bash
cd claude-custom-desktop
npm install
```

### 2. Konfigurasi API

API key sudah dikonfigurasi otomatis dari Claude CLI Anda:
- **Base URL**: `https://api.adacode.ai`
- **API Key**: Sudah tersimpan di `src/config/api-config.json`

Anda bisa mengubahnya melalui menu Settings (⚙️) di aplikasi.

### 3. Jalankan Aplikasi

**Mode Development:**
```bash
npm start
```

**Build untuk Production:**
```bash
npm run build
```

File executable akan tersimpan di folder `dist/`.

## Cara Menggunakan

1. **New Chat** - Klik tombol "➕ New Chat" untuk memulai percakapan baru
2. **Attach File** - Klik icon 📎 untuk melampirkan file
3. **Attach Image** - Klik icon 🖼️ untuk melampirkan gambar
4. **Send Message** - Ketik pesan dan tekan Enter atau klik tombol ➤
5. **History** - Semua percakapan tersimpan di sidebar kiri
6. **Settings** - Klik icon ⚙️ untuk mengubah konfigurasi API

## Lokasi Data

- **Windows**: `%APPDATA%\claude-desktop\conversations.json`
- **macOS**: `~/Library/Application Support/claude-desktop/conversations.json`
- **Linux**: `~/.config/claude-desktop/conversations.json`

## Teknologi

- **Electron** - Framework desktop
- **Node.js** - Runtime
- **Claude API** - AI backend via adaCode

## Troubleshooting

### API Error
Pastikan API key Anda valid dan masih aktif. Cek di Settings (⚙️).

### File tidak bisa diupload
Pastikan file tidak terlalu besar (max ~5MB untuk gambar).

### History hilang
History tersimpan di folder userData. Jangan hapus folder tersebut.

## License

MIT
