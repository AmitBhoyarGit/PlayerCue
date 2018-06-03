function viewModel() {
    var self = this;
    self.player = null;
    self.videoID = 76979871;
    self.videoDuration = 0;
    self.timer;
    self.cueOverflow = document.getElementById("cueOverflow");
    self.cueList = document.getElementById("cueList");

    self.initPlayer = function () {
        var options = {
            id: self.videoID,
            width: 640,
            loop: false
        };
        self.player = new Vimeo.Player('vimeo-videoPlayer', options);

        self.player.getDuration().then(function (duration) {
            self.videoDuration = duration;
        }).catch(function (error) {
            self.videoDuration = 0;
        });

        self.player.on('timeupdate', function (data) {
            var cueInput = document.getElementById("cueTime");
            cueInput.value = Math.round(data.seconds);
        });

        self.player.on('ended', function (data) {
            clearTimeout(self.timer);
            self.cueOverflow.innerHTML='';
        });

        self.player.on('seeked', function (data) {
            clearTimeout(self.timer);
            self.cueOverflow.innerHTML='';
        });

        self.player.on('cuepoint', function (cue) {
            var duration = parseInt(cue.data.CueDuration)*1000;
            var iframe = document.getElementsByTagName("iframe");
            var offset = iframe[0].offsetLeft;
            
            self.cueOverflow.innerHTML='';
            var p = document.createElement("p");
            p.innerHTML = cue.data.Description;
            self.cueOverflow.style.marginLeft = offset+'px';
            self.cueOverflow.appendChild(p);
            clearTimeout(self.timer);
            self.timer = setTimeout(function(){ 
                self.cueOverflow.innerHTML='';
            },duration);
        });
        self.loadDataFromLocalSrorage(self.videoID);
    }

    self.initEvents = function () {
        document.getElementById("addCue").addEventListener('click', function () {
            self.addQuePoint(this);
        });
        document.getElementById("btn-load").addEventListener('click', function () {
            self.loadNewVideo(document.getElementById("input-videoURL").value);
        });
    }

    self.loadNewVideo = function(id){
        self.videoID = id;
        self.cueOverflow.innerHTML='';
        self.cueList.innerHTML='';
        self.player.loadVideo(id).then(function(id) {
            self.loadDataFromLocalSrorage(self.videoID);
        }).catch(function(error) {
            alert(error.message);
        });

    }

    self.addQuePoint = function (data) {
        var cueDescription = document.getElementById("cueText");
        var cueTime = document.getElementById("cueTime");
        var cueDuration = document.getElementById("cueDuration");
        self.validateCuePoint(cueDescription.value,Math.round(cueTime.value),function(){
            self.player.addCuePoint(Math.round(cueTime.value), {
                Description: cueDescription.value,
                CueDuration:cueDuration.value?cueDuration.value : 2
            }).then(function (id) {
                self.createDOMElement(cueDescription.value, Math.round(cueTime.value), id,cueDuration.value?cueDuration.value : 2);
                setLocalStorage(id,{vid:self.videoID, d:cueDescription.value, t:Math.round(cueTime.value), dur:cueDuration.value?cueDuration.value : 2});
                self.player.pause();
                cueDescription.value = '';
                cueTime.value = '';
                cueDuration.value='';
            }).catch(function (error) {
                switch (error.name) {
                    case 'UnsupportedError':
                        alert("cue points are not supported with the current player or browser");
                        break;
                    case 'RangeError':
                        alert("Duration should be greater than 0 and less than " + self.videoDuration + " seconds");
                        break;
                    default:
                        alert("Unexpected Error.")
                        break;
                }
            });
        });

    }

    self.createDOMElement = function (cueDescription, cueTime, id,cueDuration) {
        var dId = id;
        var queElement = document.createElement("div")
        queElement.className = 'cueItem';
        queElement.id = dId;
        var cuePoint = document.createElement("div");
        cuePoint.className = 'cuePoint';
        cuePoint.innerHTML = toMinutes(cueTime);
        queElement.appendChild(cuePoint);

        var cueDec = document.createElement("div");
        cueDec.className = 'cueDec';
        var cueDecP = document.createElement("p");
        cueDecP.innerHTML = cueDescription;
        cueDec.appendChild(cueDecP);

        var deleteBTN = document.createElement("input");
        deleteBTN.type = 'button';
        deleteBTN.value = "X";
        deleteBTN.setAttribute('for', dId);
        deleteBTN.setAttribute('data-time', cueTime);
        deleteBTN.addEventListener('click', function (item) {
            if (confirm('Are you sure you want to remove cue?')) {
                var cue = document.getElementById(this.attributes["for"].nodeValue);
                var cueTime = this.attributes["data-time"].nodeValue
                self.player.removeCuePoint(this.attributes["for"].nodeValue).then(function (id) {
                    cue.parentNode.removeChild(cue);
                    removeLocalStorage(self.videoID,cueTime);
                }).catch(function (error) {
                    switch (error.name) {
                        case 'InvalidCuePoint':
                            alert("Invalid cue id");
                            break;
                        default:
                            // some other error occurred
                            break;
                    }
                });

            }

        });
        cueDec.appendChild(deleteBTN);

        s = document.createElement("small");
        s.innerHTML = 'Duration: '+cueDuration +' sec';
        cueDec.appendChild(s);

        queElement.appendChild(cueDec);
        self.cueList.appendChild(queElement);
    }

    self.validateCuePoint = function (cueDescription, cuePoint,resolve) {
        var res = false;
        res = cueDescription != '' ? true : false
        if (res) {
            self.player.getCuePoints().then(function(cuePoints) {
               for (let i = 0; i < cuePoints.length; i++) {
                   if(cuePoints[i].time == cuePoint){
                    alert("Cue point already added at this timestamp.");
                    return false;   
                   }
               }
               resolve();
            });
        }
        else {
            alert("Invalid cue point data.");
        }
       
    }

    self.loadDataFromLocalSrorage = function(id){
        var storeData=[];
        storeData = getLocalStorage(id);
        if(storeData!=null && storeData.length >0 ){
            for (let i = 0; i < storeData.length; i++) {
                self.player.addCuePoint(storeData[i].t, {
                    Description: storeData[i].d,
                    CueDuration:storeData[i].dur?storeData[i].dur : 2
                }).then(function(id) {
                    self.createDOMElement(storeData[i].d,storeData[i].t,id,storeData[i].dur);
                }).catch(function(error) {
                    console.log(error);
                });
            }
        }
    }
}

(function () {
    var vm = new viewModel();
    vm.initPlayer();
    vm.initEvents();
})();

function toMinutes(seconds){
    var m = Math.floor(seconds/ 60);
    var s = Math.round(seconds - m * 60);

    var mDisplay = m > 0 ? m+':' : "00:";
    var sDisplay = s > 0 ? (s<10? "0"+s: s)  : "00";
    return mDisplay + sDisplay; 

}

function setLocalStorage(videoId,data){
    try{
        localStorage.setItem(videoId, JSON.stringify(data));
    }
    catch(e){
        console.log("Local storage issue.");
    }
}

function getLocalStorage(videoId){
    store =[];
    try{
        for ( var i = 0, len = localStorage.length; i < len; ++i ) {
            item = JSON.parse(localStorage.getItem(localStorage.key(i)));
            if(item.vid == videoId){
                store.push(item);
            }
        }
        store.sort(function(a, b){return a.t - b.t});
        return store;
    }
    catch(e){
        console.log(e);
    }
    return store;
}

function removeLocalStorage(videoId,t){
    for ( var i = 0, len = localStorage.length; i < len; ++i ) {
        item = JSON.parse(localStorage.getItem(localStorage.key(i)));
        if(item.vid == videoId && item.t==t){
            localStorage.removeItem(localStorage.key(i));
            break;
        }
    }
}