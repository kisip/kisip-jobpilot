import fs from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve(new URL('..', import.meta.url).pathname)
const extensions = new Set(['.js','.jsx','.json','.md','.yml','.yaml'])
const skip = new Set(['node_modules','.git','dist'])
const patterns = [/[A-Za-z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD)\s*[=:]\s*['"][^'"${}\s]{8,}/i,/ghp_[A-Za-z0-9]{20,}/,/AKIA[0-9A-Z]{16}/,/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/]
async function walk(dir){const out=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(skip.has(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...await walk(full));else if(extensions.has(path.extname(entry.name)))out.push(full)}return out}
let failures=0;for(const file of await walk(root)){const body=await fs.readFile(file,'utf8');for(const pattern of patterns)if(pattern.test(body)){console.error(`Potential secret in ${path.relative(root,file)} matching ${pattern}`);failures++}}
if(failures)process.exit(1);console.log('Secret scan passed: no credential-shaped values found in project source files.')
