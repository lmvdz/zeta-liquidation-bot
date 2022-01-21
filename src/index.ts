
import { ChildProcess, fork } from 'child_process';
const workers : Map<number, ChildProcess> = new Map<number, ChildProcess>();


const spawnWorker = (index) => {
    const worker = fork(
        './src/worker.ts', 
        [], // args to send to script, use `const args = process.argv.splice(2);` to get the args in the child
        // { stdio: ['pipe', 'pipe', 'pipe', 'ipc']} // comment this out to just have all console messages be sent straight to parent console, but won't be able to send data from parent to child and vice versa
    );
    workers.set(index, worker);


    /// next 3 will only work if the stdio parameter is set to pipe

    // will print whatever the child console.error to parent console
    // worker.stderr.on('data', (data : Buffer) => {
    //     console.log(data.toString('utf-8'));
    // });

    // // will print the child's console.log
    // worker.stdout.on('data', (data : Buffer) => {
    //     console.log(data.toString('utf-8'));
    // });

    // // i kinda forget what this does
    // worker.on('data', (data : Buffer) => {
    //     console.log(data.toString('utf-8'));
    // });

    /// this is the ipc

    // called when child uses process.send
    // worker.on('message', message => {
    //     console.log(message)
    // });

    worker.on('close', () => {
        worker.kill();
        console.log('restarting ', index);
        spawnWorker(index)
    })
}

const numberOfWorkers = 1;

for(let x = 0; x < numberOfWorkers; x++) {
    spawnWorker(x)
}
