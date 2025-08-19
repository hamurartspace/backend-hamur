// scripts/migrate-cloudinary.js

const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const sqlite3 = require("sqlite3").verbose();

// 🔑 Cloudinary lama
const OLD_CLOUD = {
  cloud_name: "ddnaggrck",
  api_key: "778175363492438",
  api_secret: "M42oxXTcoQ_AyWR0B0ETsDOxfj0",
};

// 🔑 Cloudinary baru (klien)
const NEW_CLOUD = {
  cloud_name: "db6p19rbo",
  api_key: "148769217175174",
  api_secret: "Pfah2Ad8pnhqAfR-c3z7k_VGiEg",
};

// Hubungkan ke database SQLite lokal Strapi
const db = new sqlite3.Database("./.tmp/data.db");

// Konfigurasi Cloudinary
const oldCloud = cloudinary;
oldCloud.config(OLD_CLOUD);

const newCloud = cloudinary;
newCloud.config(NEW_CLOUD);

async function migrate() {
  try {
    console.log("🔍 Ambil daftar file dari Cloudinary lama...");

    // ambil semua file dari cloudinary lama (image saja dulu)
    const { resources } = await oldCloud.api.resources({
      type: "upload",
      max_results: 50,
    });

    for (const file of resources) {
      console.log(`📂 Migrasi: ${file.public_id}`);

      // ambil file dari URL lama
      const response = await axios.get(file.secure_url, {
        responseType: "arraybuffer",
      });

      // upload ke Cloudinary baru
      const upload = await newCloud.uploader.upload_stream(
        { folder: "migrated" },
        (error, result) => {
          if (error) console.error("❌ Upload error:", error);
          else {
            console.log(`✅ Uploaded ke baru: ${result.secure_url}`);

            // update database SQLite Strapi
            db.run(
              `UPDATE files SET url = ?, provider_metadata = ? WHERE url = ?`,
              [
                result.secure_url,
                JSON.stringify({
                  public_id: result.public_id,
                  resource_type: "image",
                }),
                file.secure_url,
              ],
              (err) => {
                if (err) console.error("❌ DB update error:", err);
                else console.log("📝 DB updated!");
              }
            );
          }
        }
      );

      // pipe data ke uploader
      const stream = require("stream");
      const bufferStream = new stream.PassThrough();
      bufferStream.end(Buffer.from(response.data));
      bufferStream.pipe(upload);
    }
  } catch (err) {
    console.error(err);
  } finally {
    db.close();
  }
}

migrate();
