/*-----初始化画布获取canvas节点-----*/
let A={
    formatMap() {
        this.canvas = document.getElementById('canvas');
        this.context = this.canvas.getContext('2d');
        this.loadImg()
    },
    /*-----载入图片方法-----*/
    loadImg() {
        this.canvasWidth = this.canvas.width;    // canvas画布宽度
        this.canvasHeight = this.canvas.height;  // canvas画布高度
        let this_ = this;
        this.img = new Image();
        this.img.onload = function () {
            this_.imgIsLoaded = true;
            console.log(this_.img.width);
            // this_.imgWidthHeightRatio = this_.img.width/this_.img.height; 原计划是画布宽高比根据所上传的图片确定修改为固定比例  
            this_.ratioImgCanvas = this_.img.width / this_.canvasWidth;     // 图片的宽度/canvas画布宽度
            this_.ratioImgCanvas1 = this_.img.height / this_.canvasHeight;  // 图片的高度/canvas画布高度

            for (let i = 0; i < this_.resPosArr.length; i++) {      // resPosArr 为后端取来的坐标数组 longitude 横坐标x，latitude 纵坐标y，包含一些其他相机数据
                this_.initArr[i] = {};                            // 初始化原有坐标集合，相对背景定位 eg：[{x:110,y:110},{x:220,y:220},{x:330,y:330},{x:110,y:69}]; 
                this_.initArr[i].x = (this_.resPosArr[i].longitude) / this_.ratioImgCanvas;    // 根据 图片与canvas宽高比换算出，当图片平铺在canvas上时，坐标在canvas上的坐标，方便绘图函数绘制坐标为位置，（放大缩小时需要原有坐标，该数组值不会根据惭怍变化而变化，放大缩小或者拖动）。
                this_.initArr[i].y = (this_.resPosArr[i].latitude) / this_.ratioImgCanvas1;
            }
            console.log(this_.initArr);
            for (let k = 0; k < this_.initArr.length; k++) {       // iconArr 绘图函数绘图时坐标为位置，放大缩小/拖动，坐标在canvas上的坐标会一直变化（相对背景图片不会变化）
                this_.iconArr[k] = {};
                this_.iconArr[k].x = this_.initArr[k].x;
                this_.iconArr[k].y = this_.initArr[k].y;
            }
            this_.drawImageCanvas();   // 调用绘图函数
        }
        this.img.src = this.imgSrc; //矢量图
        /*icon图片对象*/
        this.icon = new Image();
        this.icon.onload = function () {
            this_.iconIsLoaded = true;
            this_.drawImageCanvas();
        }
        this.icon.src = "../../../../static/img/map/already_edit.png"; // 地图上原有的图标
        this.addIcon = new Image();
        this.addIcon.onload = function () {
        }
        this.addIcon.src = '../../../../static/img/map/current_edit.png';// 地图上新增的图标
        console.log(this.addIcon);
    },
    /*-----绘图函数-----*/
    drawImageCanvas(x, y) {
        console.log('执行次数');
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);      // 清空背景
        // 画背景
        this.context.drawImage(this.img, 0, 0, this.img.width, this.img.height, this.imgX, this.imgY, this.canvas.width * this.imgScale, this.canvas.height * this.imgScale);
        for (let i = 0; i < this.iconArr.length; i++) {
            this.context.drawImage(this.icon, this.iconArr[i].x - 16, this.iconArr[i].y - 16, 32, 32) // 画原有坐标（坐标集合）
        }
        /*未点击新增坐标时，不绘制新增icon*/
        if (x !== undefined && y !== undefined && x !== '' && y !== '') {
            this.context.drawImage(this.addIcon, x - 16, y - 16, 32, 32)           // 画新增坐标
        } else if (this.addIconX !== '' && this.addIconY !== '') {
            this.context.drawImage(this.addIcon, this.addIconX - 16, this.addIconY - 16, 32, 32)           // 画新增坐标
        }
    },
    /*-----鼠标按下/拖动/抬起事件-----*/
    mouseEvent() {
        let this_ = this;
        this.canvas.onmousedown = function (event) {
            let pos0 = this_.windowToCanvas(this_.canvas, event.clientX, event.clientY); // 调用窗口坐标转canvas坐标函数
            let pos = this_.windowToCanvas(this_.canvas, event.clientX, event.clientY);
            this_.canvas.onmousemove = function (event) {
                let pos1 = this_.windowToCanvas(this_.canvas, event.clientX, event.clientY);
                /*按下坐标在新增坐标上，拖动坐标位置or拖动背景图片*/    // 注：此处为操作逻辑处理，当按下位置在新增坐标上，拖动时 拖动的是新增坐标，背景不会动，否则拖动背景 
                // 坐标为一个点，画布上以坐标为中心点画一个32px*32px的正方形，这样就有了鼠标按下的判断区间
                if (pos.x > this_.addIconX1 - 16 && pos.x < this_.addIconX1 + 16 && pos.y > this_.addIconY1 - 16 && pos.y < this_.addIconY1 + 16) {
                    // 当拖动新增坐标时 ，鼠标位置为新增坐标位置
                    this_.addIconX2 = pos1.x;
                    this_.addIconY2 = pos1.y;
                    this_.drawImageCanvas(this_.addIconX2, this_.addIconY2);
                } else {  // 鼠标按下的位置在画布上（不在新增坐标上）
                    /*鼠标移出canvas画布外=> 禁止拖动*/
                    if (pos1.x >= this_.canvas.width - 20 || pos1.y >= this_.canvas.height - 20 || pos1.x <= 20 || pos1.y <= 20) {
                        this_.canvas.onmousemove = null;
                        return false;
                    }
                    let x = pos1.x - pos.x;     // 鼠标按下坐标与移动坐标差值
                    let y = pos1.y - pos.y;
                    pos = pos1;
                    this_.imgX += x;
                    this_.imgY += y;
                    /*背景拖到边缘时禁止拖动*/
                    if (this_.imgX >= 0) {
                        this_.imgX = 0;
                    }
                    if (this_.imgY >= 0) {
                        this_.imgY = 0;
                    }
                    if (-(this_.imgX) >= (this_.canvas.width * this_.imgScale - this_.canvas.width)) {
                        this_.imgX = -(this_.canvas.width * this_.imgScale - this_.canvas.width)
                    }
                    if (-(this_.imgY) >= (this_.canvas.height * this_.imgScale - this_.canvas.height)) {
                        this_.imgY = -(this_.canvas.height * this_.imgScale - this_.canvas.height)
                    }
                    // console.log('画布原点',this_.imgX,this_.imgY);
                    for (let j = 0; j < this_.iconArr.length; j++) {              // 坐标集合移动处理 此处为拖动时坐标处理 => 不理解可以在纸上画画，确定坐标数据计算方式
                        this_.iconArr[j].x = this_.imgX + this_.initArr[j].x;
                        this_.iconArr[j].y = this_.imgY + this_.initArr[j].y;
                    }
                    this_.drawImageCanvas(this_.addIconX1, this_.addIconY1);   // 绘制图片/ 新增坐标相对canvas不变化 addIconX1,在拖动时为定值，拖动时在canvas上的位置没变化
                }
            }
            this_.canvas.onmouseup = function (event) {
                let pos2 = this_.windowToCanvas(this_.canvas, event.clientX, event.clientY);
                this_.canvas.style.cursor = "default";
                this_.canvas.onmousemove = this_.cnvs_getCoordinates;  // 鼠标在canvas上越过时触发函数，为实现其他功能暂时忽略
                this_.canvas.onmouseup = null;

                /*鼠标按下抬起时，是否产生移动=》是：拖动事件，否：点击事件*/
                let x1 = pos2.x - pos0.x;
                let y1 = pos2.y - pos0.y;
                if (x1 === 0 && y1 === 0) {
                    console.log("点击事件");
                    for (let i = 0; i < this_.iconArr.length; i++) {
                        if (pos2.x >= this_.iconArr[i].x - 16 && pos2.x <= this_.iconArr[i].x + 16 && pos2.y >= this_.iconArr[i].y - 16 && pos2.y <= this_.iconArr[i].y + 16) {
                            this_.handleCanvasIconClick(i, pos2)  // 点击时 当点击在原有坐标上可进行修改操作调用函数 暂时忽略
                        }
                    }
                } else {
                    console.log("拖动事件");
                    /*当拖动新增坐标时，鼠标移动最终位置位置，为新增坐标最终位置 => 注意点*/
                    if (pos.x > this_.addIconX1 - 16 && pos.x < this_.addIconX1 + 16 && pos.y > this_.addIconY1 - 16 && pos.y < this_.addIconY1 + 16) {
                        this_.addIconX1 = this_.addIconX2;
                        this_.addIconY1 = this_.addIconY2;
                    }
                }
            }
        }
    },

    /*-----点击放大按钮->以中心点放大-----*/
    // 放大方法图片是以中心点放大 缩小同理，计算方式比较简单
    magnifyFn() {
        this.alertMsgBox.style.display = 'none';
        if (this.imgScale < 3.6) {
            this.imgScale *= 1.2;
            this.imgX = (this.canvas.width - this.canvas.width * this.imgScale) / 2;
            this.imgY = (this.canvas.height - this.canvas.height * this.imgScale) / 2;
            // 放大缩小需处理 原有坐标集合，注意点
            for (let i = 0; i < this.initArr.length; i++) {
                this.initArr[i].x = this.initArr[i].x * 1.2;
                this.initArr[i].y = this.initArr[i].y * 1.2;
            }
            for (let j = 0; j < this.iconArr.length; j++) {
                this.iconArr[j].x = this.imgX + this.initArr[j].x;
                this.iconArr[j].y = this.imgY + this.initArr[j].y;
            }
            this.drawImageCanvas(this.addIconX2, this.addIconY2);
            return false;
        } else {
            this.$alert('已经最大了', {
                confirmButtonText: '确定',
                center: true
            });
        }
    },
    /*-----点击缩小按钮，以中心点缩小-----*/
    shrinkFn() {
        this.alertMsgBox.style.display = 'none';
        if (this.imgScale > 1) {
            this.imgScale /= 1.2;
            this.imgX = (this.canvas.width - this.canvas.width * this.imgScale) / 2;
            this.imgY = (this.canvas.height - this.canvas.height * this.imgScale) / 2;

            for (let i = 0; i < this.initArr.length; i++) {
                this.initArr[i].x = this.initArr[i].x / 1.2;
                this.initArr[i].y = this.initArr[i].y / 1.2;
            }
            for (let j = 0; j < this.iconArr.length; j++) {
                this.iconArr[j].x = this.imgX + this.initArr[j].x;
                this.iconArr[j].y = this.imgY + this.initArr[j].y;
            }
            this.drawImageCanvas(this.addIconX2, this.addIconY2);
            // console.log('画布原点',this.imgX,this.imgY);
        } else {
            this.$alert('已经最小了', {
                confirmButtonText: '确定',
                center: true
            });
        }
        return false;
    },

    /*-----选择相机后新增坐标-----*/
    // 点击新增坐标按钮后，新增坐标初始位置在canvas画布中心
    addBtnClick() {
        this.addIconX = this.canvas.width / 2;
        this.addIconY = this.canvas.height / 2;
        this.drawImageCanvas(this.addIconX, this.addIconY);
        this.addIconX1 = this.addIconX;
        this.addIconY1 = this.addIconY;
    },
    /*-----window坐标转canvas坐标-----*/
    windowToCanvas(canvas, x, y) {
        let bbox = canvas.getBoundingClientRect();
        return {
            x: x - bbox.left - (bbox.width - canvas.width) / 2,
            y: y - bbox.top - (bbox.height - canvas.height) / 2
        };
    }
}
