const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const zlib = require("node:zlib");
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.error("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
const command = process.argv[2];

switch (command) {
  case "init":
    createGitDirectory();
    break;
    case "cat-file":
     readFileBlob();
     break;
    case "hash-object":
        createFileBlob();
        break;
    case "ls-tree":
        readTreeBlob();
        break;
    case "write-tree":  
        createTreeBlob();
        break;
    case "commit-tree":
        createCommitTree();
        break;
    case "clone":
        cloneRepo();
        break;
  default:
    throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
  fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });

  fs.writeFileSync(path.join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
  console.log("Initialized git directory");
}
function readFileBlob(){
    //you should provide file sha code
  const blob = fs.readFileSync(path.join(process.cwd(), '.git', 'objects', process.argv[4].substring(0, 2), process.argv[4].substring(2) ))
  const bufferToString = zlib.unzipSync(blob).toString()
  process.stdout.write(bufferToString.substring(bufferToString.indexOf('\x00')+1))
}
function createFileBlob(){
    const userFile = process.argv[4];
    //not convert the file content into string as some ASCII value conversion to string from byte can cause change in file content
    const fileContentBuffer = fs.readFileSync(userFile);
    const header = `blob ${fileContentBuffer.length}\0`;

    //we convert header to buffer and then concat two buffer!
    const blob = Buffer.concat([ Buffer.from(header) , fileContentBuffer]);

    //converting to sha1 using crypto
    const sha = crypto.createHash("sha1").update(blob).digest("hex");
    process.stdout.write(sha + "\n");
    
    const dir = sha.slice(0,2);
    const file = sha.slice(2);

    //putting into the object folder/directory
    fs.mkdirSync(path.join(process.cwd(), ".git", "objects",dir), { recursive: true });

    //putting the file name in that obj directory and compress it
    const compressedBlob = zlib.deflateSync(blob);
    fs.writeFileSync(path.join(process.cwd(), ".git", "objects",dir,file),compressedBlob);
    console.log("SHA-1 file code: ",sha);
}

function createTreeBlob(dirpath=path.join(process.cwd())){
    const entries = fs.readdirSync(dirpath, {withFileTypes: true});
    // console.log(entries)
    const treeEntries=[]
    let sha,mode;
    for(const entry of entries){
        if(entry.name.startsWith(".")) continue;

        if(entry.isFile()){
            const fileContentBuffer = fs.readFileSync(path.join(dirpath,entry.name));
            const header = `blob ${fileContentBuffer.length}\0`;
                //we convert header to buffer and then concat two buffer!
            const blob = Buffer.concat([ Buffer.from(header) , fileContentBuffer]);

            //converting to sha1 using crypto
            sha = crypto.createHash("sha1").update(blob).digest("hex");

            const dir = sha.slice(0,2);
            const file = sha.slice(2);
            const path_name = path.join(".git","objects",dir);
            
            // console.log(path_name)

            //check if the dir already exist in object?
            if(!fs.existsSync(path_name)){
                const compressedBlob = zlib.deflateSync(blob);
                fs.mkdirSync(path.join(".git","objects",dir), { recursive: true });
                fs.writeFileSync(path.join(path_name,file),compressedBlob);
            }
            mode="100644";
        }else if (entry.isDirectory()){
            sha = createTreeBlob(path.join(dirpath,entry.name)); 
            mode = "040000";
        }else{
            continue;
        }

        //we are storing tree object entries! <mode> <name> <20 bit raw sha>
        const entryHeader = `${mode} ${entry.name}\0`;
        const shaBuffer = Buffer.from(sha, "hex");
        treeEntries.push(Buffer.concat([Buffer.from(entryHeader), shaBuffer]));
    }

    const body = Buffer.concat(treeEntries);
    const header = Buffer.from(`tree ${body.length}\0`);
    const full = Buffer.concat([header,body]);

    const treeSha = crypto.createHash("sha1").update(full).digest("hex");
    const treeDir = treeSha.slice(0, 2);
    const treeFile = treeSha.slice(2);
    const treePath = path.join(".git", "objects", treeDir, treeFile);

    if (!fs.existsSync(treePath)) {
        fs.mkdirSync(path.join(".git", "objects", treeDir), { recursive: true });
        fs.writeFileSync(treePath, zlib.deflateSync(full));
    }

    console.log(`tree: ${treeSha} for dir: ${dirpath}`);
    return treeSha;
}

function readTreeBlob(){
    const compressTreeBlob = fs.readFileSync(path.join(process.cwd(),".git","objects",process.argv[4].substring(0,2), process.argv[4].substring(2)));
    const bufferTree = zlib.unzipSync(compressTreeBlob)
    
    const nameList = parseTree(bufferTree);

    nameList.sort((a,b)=> a.name.localeCompare(b.name));
    nameList.map(obj =>{
        process.stdout.write(obj.name + ' '+ obj.shaHex + '\n');
    })
}

function parseTree(bufferTree){
    const nameList=[];
    //get rid of header
    const nullIndex = bufferTree.indexOf(0x00);
    let offset = nullIndex+1;

    while(offset < bufferTree.length){
        //getting mode 
        const modeSpace = bufferTree.indexOf(0x20, offset);
        
        //getting name
        const nameStartIndex = modeSpace+1;
        const nameEndIndex = bufferTree.indexOf(0x00,nameStartIndex);
        const name = bufferTree.slice(nameStartIndex,nameEndIndex).toString();

        //getting sha code (20 byte)
        const shaByte = bufferTree.slice(nameEndIndex+1, nameEndIndex + 21);
        const shaHex = shaByte.toString("hex");

        //saving the name sha
        nameList.push({name, shaHex});

        offset=nameEndIndex+21;   
    }
    return nameList;

}

//commit tree is a blob that stores the things like:-
// Committer/Author name + email
// Timestamp
// Tree SHA
// Parent commit SHA(s), if any

//I will also add tree sha, author name, commiter name and message

function createCommitTree(){
    let message = "commited!"
    if(process.argv[3]=="-m"){
        message = process.argv[4];
    }
    const treesha = process.argv[5];

    const content = 
    `tree ${treesha}
    author Satyam 
    committer David

    ${message}`;

    const commitHeader = `commit ${Buffer.byteLength(content)}\0`
    const full = Buffer.concat([Buffer.from(commitHeader),Buffer.from(content)]);
    const sha = crypto.createHash("sha1").update(full).digest("hex");
    const dir = sha.slice(0, 2);
    const file = sha.slice(2);
    const objectPath = path.join(".git", "objects", dir, file);

    if (!fs.existsSync(objectPath)) {
        fs.mkdirSync(path.join(".git", "objects", dir), { recursive: true });
        fs.writeFileSync(objectPath, zlib.deflateSync(full));
    }

    console.log(`commit: ${sha}`);
}


// //1) first step fetch the data from github
// // github uses smart HTTP :- https://github.com/user/repo.git/info/refs?service=git-upload-pack
// async function cloneRepo(){
//     //binary format output and It uses a format called pkt-line, short for packet line in its binary output!
//     const res = await fetch("https://github.com/1WINgFIRE1/DigiPin.git/info/refs?service=git-upload-pack");

        //we use isomorphic-git npm to communicate with git because they talk in packet line format
// }
async function cloneRepo(){
    const urlPath = process.argv[3];
    const gitRepo = path.basename(new URL(urlPath).pathname, ".git");
    const dirName = process.argv[4] || gitRepo
    try {
        const res = await git.clone({
        fs,
        http,
        dir: path.join(process.cwd(),dirName),
        corsProxy: 'https://cors.isomorphic-git.org',
        url: urlPath,
        singleBranch: true,
        depth: 1
        });
        console.log("Clone Success", res);
    } catch (err) {
        console.error("Clone Failed:", err.message);
    }
}