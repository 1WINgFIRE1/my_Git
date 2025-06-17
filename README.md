# 🔧 Build-Your-Own-Git

A beginner-friendly yet powerful reimplementation of Git's core features using **Node.js** and **vanilla JavaScript**, designed to help you deeply understand how Git works under the hood.

> 🚀 Inspired by how Git actually stores, hashes, compresses, and tracks files — no Git CLI commands used!

---

## 📚 Features Implemented

### ✅ 1. `git init`
- Creates the basic `.git/` folder structure manually.
- Directories created: `.git/objects`, `.git/refs`, `.git/HEAD`.

---

### ✅ 2. `git hash-object <file>`
- Reads file content, creates a SHA-1 hash.
- Stores it in `.git/objects` as a compressed blob object.

---

### ✅ 3. `git cat-file <sha>`
- Reads a Git object by SHA from `.git/objects`.
- Decompresses and displays the original content.

---

### ✅ 4. `git write-tree`
- Walks through the directory and encodes the file/folder hierarchy as a **tree object**.
- Stores raw SHA-1 + mode + name in Git tree format.

---

### ✅ 5. `git ls-tree <tree-sha>`
- Parses a tree object and prints its contents:
  - Mode (file/dir)
  - Filename
  - SHA of the file/blob/tree

---

### ✅ 6. `git commit-tree <tree-sha> -m <msg>`
- Creates a Git **commit object** with:
  - Tree SHA
  - Author & Committer
  - Commit message
- Compresses and stores it in `.git/objects`.

---

### ✅ 7. `git clone <url>`
- Uses `isomorphic-git` and `http` to clone a public GitHub repo into a directory.
- Supports shallow clones (depth 1).
- All files are written without needing Git CLI installed!

---

## 🛠️ Tech Stack

- **Node.js**
- **fs, path, crypto, zlib**
- [`isomorphic-git`](https://isomorphic-git.org/)
- Plain JavaScript – no frameworks!

---

## 📁 Folder Structure
.git/├── HEAD # Points to the current branch (e.g., refs/heads/main)├── objects/ # Contains all Git objects (blobs, trees, commits)│ ├── \[2-char SHA prefix\]/│ │ └── \[remaining SHA\] # Compressed Git object├── refs/│ └── heads/│ └── main # Points to the latest commit on the main branch

---

## 🧠 What I Learned

- How Git stores everything as compressed objects using SHA-1
- How `.git/objects` and `.git/index` work
- The difference between working directory, staging area, and committed history
- How to parse binary Git tree formats
- How a commit is just metadata pointing to a tree with a message!

---

## 📦 How to Run

```bash
# Hash a file
node app/main.js hash-object <file>

# Create a tree from current directory
node app/main.js write-tree

# Commit the tree
node app/main.js commit-tree <tree-sha> -m "Initial commit"

# Read a blob/tree
node app/main.js cat-file <sha>
node app/main.js ls-tree <tree-sha>

# Clone a public repo (uses isomorphic-git)
node app/main.js clone

