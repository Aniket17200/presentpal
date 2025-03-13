//file utility 
const fs = require("fs").promises;

async function createDirectories() {
    const directories = ["uploads", "ppt_storage", "temp"];
    
    try {
        await Promise.all(
            directories.map(dir => 
                fs.mkdir(dir, { recursive: true })
                    .then(() => console.log(`${dir} directory ready`))
            )
        );
    } catch (err) {
        console.error("Directory creation error:", err);
        throw err; // Propagate error to calling code
    }
}

module.exports = { createDirectories };