const fs = require("fs");
const { fileTypeFromBuffer } = require("file-type");

const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf"
];

const validateFileSignature = async (req, res, next) => {
    try {
        const files = req.files || [];

        for (const file of files) {
            const buffer = fs.readFileSync(file.path);

            const detectedType =
                await fileTypeFromBuffer(buffer);

            if (!detectedType) {
                fs.unlinkSync(file.path);

                return res.status(400).json({
                    error:
                        "Invalid or unsupported file."
                });
            }

            if (
                !allowedMimeTypes.includes(
                    detectedType.mime
                )
            ) {
                fs.unlinkSync(file.path);
                
                return res.status(400).json({
                    error:
                        "File content does not match allowed file types."
                });
            }
        }

        next();
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error:
                "File validation failed."
        });
    }
};

module.exports = validateFileSignature;