import io
import os

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np
import tensorflow as tf

# Konfigurasi dasar
MODEL_PATH = os.path.join(os.path.dirname(__file__), "best_model.h5")
IMG_SIZE = (224, 224)  # Ubah sesuai ukuran input model Anda
CLASS_NAMES = ["Busuk", "Segar"]  # Ubah sesuai label model Anda

# Inisialisasi app Flask
app = Flask(__name__)
CORS(app)

# Load model sekali di awal
model = tf.keras.models.load_model(MODEL_PATH)


def preprocess_image(image: Image.Image) -> np.ndarray:
    """Resize dan normalisasi gambar agar sesuai dengan input model."""
    image = image.convert("RGB")
    image = image.resize(IMG_SIZE)
    arr = np.array(image) / 255.0
    arr = np.expand_dims(arr, axis=0)
    return arr


@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "Tidak ada file yang dikirim"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Nama file kosong"}), 400

    try:
        img_bytes = file.read()
        image = Image.open(io.BytesIO(img_bytes))
        input_tensor = preprocess_image(image)

        preds = model.predict(input_tensor)
        # Asumsi output berupa probabilitas untuk setiap kelas
        if preds.ndim == 2 and preds.shape[1] == len(CLASS_NAMES):
            probs = preds[0].tolist()
            class_index = int(np.argmax(probs))
            confidence = float(probs[class_index])
        else:
            # Fallback untuk kasus output tunggal (mis. sigmoid)
            score = float(preds[0][0])
            # Anggap threshold 0.5 antara Segar / Tidak Segar
            if score >= 0.5:
                class_index = 0
                confidence = score
            else:
                class_index = 1
                confidence = 1.0 - score

        label = CLASS_NAMES[class_index]

        return jsonify(
            {
                "label": label,
                "confidence": confidence,
                "class_index": class_index,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Jalankan di localhost:5000
    app.run(host="0.0.0.0", port=5000, debug=True)
