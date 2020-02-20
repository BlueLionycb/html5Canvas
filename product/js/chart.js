
/**
 * 图表基类
 */
class Chart {
    constructor(container) {
        this.container = container;//canvas容器
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.W = 500; //画布宽
        this.H = 500; //画布高
        this.paddingTop = 0;//canvas容器距上高度（为标题留空白）
        this.paddingBottom = 30;
        this.title = '';//散点图的标题
        this.legend = []; //图例
        this.series = []; //坐标系中的点数据
        this.xAxis = {}; //x轴信息
        this.yAxis = {}; //y轴信息
        this.animateArr = [];
        this.mapDataArr = [];//被处理后的整个地图数据
        this.info = {};
        this.maxScale = 1.728;
        this.translateX = 0;
        this.translateY = 0;
        this.scale = 1;//地图放大倍数

    }
    init(opt) {
        Object.assign(this, opt);
        if (!this.container) return;
        this.W *= 2;
        this.H *= 2;
        this.canvas.width = this.W;
        this.canvas.height = this.H;
        this.canvas.style.width = this.W / 2 + 'px';
        this.canvas.style.height = this.H / 2 + 'px';
        this.container.style.position = 'relative';
        this.tip = document.createElement('div');
        this.tip.style.cssText = 'display: none; position: absolute; opacity: 0.5; background: #000; color: #fff; border-radius: 5px; padding: 5px; font-size: 8px; z-index: 99;';
        this.container.appendChild(this.canvas);
        this.container.appendChild(this.tip);
        this.create(true);
        //this.bindEvent();
        this.addEvent();
    }
    showTip(pos, title, arr) {
        var box = this.canvas.getBoundingClientRect(),
            con = this.container.getBoundingClientRect(),
            html = '',
            txt = '';
        html += '<p>' + title + '</p>';
        arr.forEach(obj => {
            txt = this.yAxis.formatter ? this.yAxis.formatter.replace('{value}', obj.num) : obj.num;
            html += '<p>' + obj.name + ': ' + txt + '</p>';
        })
        this.tip.innerHTML = html;
        this.tip.style.left = (pos.x + (box.left - con.left) + 15) + 'px';
        this.tip.style.top = (pos.y + (box.top - con.top) + 15) + 'px';
        this.tip.style.display = 'block';
    }
}

class Point {
    constructor(params) {
        this.x = params.x;
        this.y = params.y;
        this.productId = params.productId;

    }

}

/**
 * 散点图
 */
class Map extends Chart {
    constructor(container) {
        super(container);
        this.xAxisStyle = {
            fillStyle: '#000',
            strokeStyle: 'red',
            lineWidth: 1,
            textAlign: 'center',
            textBaseLine: 'middle',
            font: '18px arial'
        }
        this.yAxisStyle = {
            fillStyle: '#000',
            strokeStyle: 'red',
            lineWidth: 1,
            textAlign: 'center',
            textBaseLine: 'middle',
            font: '18px arial'
        }
    }
    beLarger(e) {
        let that = this,
            ctx = this.ctx,
            currentScale = this.scale;

        let box = that.canvas.getBoundingClientRect(),
            pos = {
                x: e.srcEvent.clientX - box.left,
                y: e.srcEvent.clientY - box.top
            },
            { x, y } = pos;



        //if (currentScale > 1) {//放大了的情况
        if (currentScale < that.maxScale) {//最大了
            currentScale = that.scale = currentScale * 1.2//放大1.2倍
            if (currentScale > 1.728) {
                currentScale = 1.728
            }
            ctx.clearRect(0, 0, that.W, that.H)
            //点击的当前点位移了
            console.log("平移距离", (x - currentScale * x), (y - currentScale * y))
            //ctx.transform(currentScale,0,0,currentScale,(x - currentScale * x),(y - currentScale * y));
            that.translateX = (x - currentScale * x);
            that.translateY = (y - currentScale * y);
            console.log("双击点的坐标", x, y, "坐标系里真实坐标", 2 * x + this.translateX, 2 * y + this.translateY)
            ctx.translate((x - currentScale * x) * 2, (y - currentScale * y) * 2)//画布偏移
            ctx.scale(currentScale, currentScale)//TODO 确认是否是累计的
            ctx.save();

            //绘制坐标系
            that.create()
            ctx.restore()
        } else {
            alert("最大了，不能放大了！")
        }
        //}

    }


    addEvent() {
        let that = this,
            ctx = that.ctx,
            canvas = that.canvas,
            W = this.W,
            H = this.H,
            xLength = this.W,
            xl = this.xAxis.data.length,//被分成多少段
            imgH = 57,
            imgW = 51,
            currentScale = this.scale,//当前放大倍数
            xs = xLength / xl;//x每段长度
        let hammerDom = document.querySelector("canvas"),
            hammer = new Hammer(hammerDom),
            hammerManager = new Hammer.Manager(hammerDom, {
                recognizers: [
                    [Hammer.Pinch, {
                        enable: true
                    }]
                ]
            });

        if (!this.series.length) return;//没有数据（没有点）

        //自定义单双击事件
        hammerManager.add(new Hammer.Tap({ event: 'doubletap', taps: 2 }));
        hammerManager.add(new Hammer.Tap({ event: 'singletap' }));
        //双击时，单击失效；单击不受影响
        hammerManager.get('doubletap').recognizeWith('singletap');
        hammerManager.get('singletap').requireFailure('doubletap');

        hammerManager.on("doubletap", function (e) {
            that.beLarger(e);
        })
        hammerManager.on("singletap", function (e) {
            e.preventDefault()
            let box = that.canvas.getBoundingClientRect(),
                pos = {
                    x: e.srcEvent.clientX - box.left,
                    y: e.srcEvent.clientY - box.top
                }
            console.log("当前点坐标", pos.x, pos.y);
            //当前点击点的坐标是（translateX+pos.x,translateY+pos.y ）    
            //判断点击的点在坐标网格中(*2 是因为canvas放大了两倍)
            if (2 * pos.x > 0 && 2 * pos.x < W && pos.y * 2 > that.paddingTop && pos.y * 2 < H - that.paddingBottom) {
                let arr = [] //存放点中点的信息
                //TODO 创建一个完整的数据json
                for (let i = 0, item; i < that.mapDataArr.length; i++) {
                    item = that.mapDataArr[i]

                    for (let j = 0, obj; j < item.data.length; j++) {
                        obj = item.data[j]
                        //ctx.beginPath()
                        //ctx.fillStyle = 'rgba(0,0,0,0.1)'
                        ctx.rect(obj.x * currentScale - imgW / currentScale / 2, obj.y * currentScale - imgH / currentScale, imgW / currentScale, imgH / currentScale)
                        //(x * currentScale - makerW / currentScale / 2)
                        //console.log(i,j,ctx.isPointInPath(pos.x, pos.y))

                        if (ctx.isPointInPath(pos.x * 2 * currentScale, pos.y * 2 * currentScale)) {
                            arr.push(obj);
                            that.clearMap({ i: i, j: j });
                            console.log(i, j, obj.x, obj.y)

                            break;
                        }
                    }
                    if (arr.length) {//点中了点跳出循环
                        break;
                    }
                }
                if (arr.length) {

                } else {//点击在坐标系中非标注点
                    that.clearMap();
                }



            } else {
                //不在网格中的处理
                that.clearMap();
                //return;
            }



        })

        //this.canvas.addEventListener("click", , false)//冒泡过程中执行处理函数

        hammer.on("pan", function (e) {
            alert("pan")
            console.log(e)

        })
    }

    create(isFirst) {
        //刷新进来的
        if (isFirst) {
            isFirst = true;
        } else {
            isFirst = false;
        }
        // 组织数据
        //this.initData();
        // 画坐标系
        if (isFirst) {//初始化进来
            this.drawX();
            this.drawY();
            this.drawMarker();
        } else {
            console.log("事件点击");
            this.drawX();
            this.drawY();
            this.drawMarker();
        }
        // 画y轴刻度
        //this.drawY();
        // 画标签
        //this.drawTag();
        // 执行动画
        //this.animate();
    }

    drawX() {
        let that = this,
            ctx = this.ctx,
            currentScale = 1,
            W = this.W * currentScale,//放大后的
            H = this.H * currentScale,
            padding = 0,
            paddingTop = that.paddingTop * currentScale,
            paddingBottom = that.paddingBottom * currentScale,
            xLength = W,
            xl = this.xAxis.data.length,//被分成多少段
            xs = xLength / xl;//x每段长度

        Object.assign(ctx, this.xAxisStyle);

        console.log("每段长度", xs)
        ctx.clearRect(0, 0, W, H);
        // x轴
        ctx.save();
        //ctx.translate(50,50)
        ctx.beginPath();
        ctx.setLineDash([])
        //ctx.translate(0, H - paddingBottom);
        ctx.moveTo(0, H - paddingBottom);
        ctx.lineTo(W, H - paddingBottom);
        ctx.stroke();

        this.xAxis.dataShow.forEach((num, i) => {
            var x = xs * (i + 1) + 0.5,
                txt;

            if (that.xAxis) {
                //txt = that.xAxis.formatter.replace('{value}', num);
                txt = num
            }
            ctx.fillText(txt, x, H - paddingBottom + 20);
            ctx.beginPath();
            ctx.lineWidth = 0.5
            ctx.setLineDash([3, 6])
            ctx.strokeStyle = 'gray';
            ctx.moveTo(x, H - paddingBottom);
            ctx.lineTo(x, paddingTop);
            ctx.stroke();
        });
        //绘制（0，0）点的垂直线
        ctx.beginPath();
        ctx.lineWidth = 0.5
        ctx.setLineDash([3, 6])
        ctx.strokeStyle = 'gray';
        ctx.moveTo(0, H - paddingBottom);
        ctx.lineTo(0, 0);
        ctx.stroke();

        ctx.restore();
    }
    drawY() {
        var that = this,
            currentScale = 1,
            xLength = this.W * currentScale,
            yLength = (this.H - this.paddingBottom - this.paddingTop) * currentScale,
            yl = this.yAxis.data.length - 1,
            ys = yLength / yl,
            xl = this.xAxis.data.length,//被分成多少段
            xs = xLength / xl,
            ctx = this.ctx;

        ctx.save();
        [...this.yAxis.dataShow].reverse().forEach((num, i) => {
            var y = ys * (i + 1) + 0.5,
                txt;
            ctx.textAlign = 'right';
            if (that.yAxis) {
                //txt = that.yAxis.formatter.replace('{value}', num);
                txt = num
            }
            ctx.fillText(txt, xs - 10, ys * i + this.paddingTop + 20);
            if (i < yl) {//最后一根有x轴代替，不用画了
                ctx.beginPath();
                ctx.lineWidth = 0.5
                ctx.setLineDash([3, 6])
                ctx.strokeStyle = 'gray';
                ctx.moveTo(0, ys * i + this.paddingTop * currentScale);
                ctx.lineTo(xLength, ys * i + this.paddingTop * currentScale);
                ctx.stroke();
            }

        });
        ctx.restore();
        //画数据
    }

    /**
     * 原始数据转为坐标轴数据
     * （包括放大缩放的坐标的处理）
     */
    dataToXY(data) {
        let that = this,
            x,
            y,
            //currentScale = that.scale,
            xLength = this.W,
            yLength = (this.H - this.paddingBottom - this.paddingTop),
            xmin = this.xAxis.data[0],//x轴最小值
            xmax = this.xAxis.data.slice(-1)[0],//x轴最大值
            ymin = this.yAxis.data[0],//y轴最小值
            ymax = this.yAxis.data.slice(-1)[0],//y轴最大值
            xl = this.xAxis.data.length,//被分成多少段
            xs = xLength / xl,//x每段长度
            obj = {},//暂存坐标轴数据点
            axisData = [];//坐标轴上的数据
        data.forEach((item, i) => {
            axisData[i] = item
            axisData[i].x = (Math.floor((item.xVal - xmin) / (xmax - xmin) * (xLength - xs)) + xs)  //在坐标系中的x值,多画一列展示数据
            axisData[i].y = (yLength - Math.floor((item.yVal - ymin) / (ymax - ymin) * yLength))   //在坐标系中的y值
            //axisData[i].num = item.num
            //axisData[i].name = item.name

        })

        return axisData;
    }
    /**
     * 输出不通的标记
     */
    createMaker(x, y, type) {
        let ctx = this.ctx,
            img = new Image(),
            that = this,
            currentScale = 1,
            makerH = 57,
            makerW = 51,
            selectedMakerW = 117,
            selectedMakerH = 138
        switch (type) {
            case "type_0"://默认产品
                img.src = "data:image/png;base64,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"
                break;
            case "type_1"://活动产品
                img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADMAAAA5CAYAAACbOhNMAAAAAXNSR0IArs4c6QAACBdJREFUaAXdWmlsVFUUPgVkp1C2AkUohqUoZRGBsqi00dAiYhAQEGrUoGAwAf4YYvhjYgwaCQlGAiFGQCOaCNFabGOiFFBWQwoKkaUIgrLWsgiylfH77p37+t6b92Zep+0weJIzdz/3++aeu86I/I8kpb65hEKhxrCZCe0H7Q5tA20B/Rd6BXoKegh6PCUlpRphcgkIpEKnQT+DXoQGEdZjfbZLveuMACIXWgK9Aa2LsD3t5NaFVFxuhk4HotMl0AKvzq9cFamCQ136R+tVOFgrOFrb1lrT4HhtWnm1VHkl+FwEF9zvW8OnoFZkQCINdpZBC6GNjM1QSOTEaZH9h6FHRM5UmhL/sEsHkYF9oH1FenYVSXEiuYOWn0AXglSVvxVnidOEs8yRApEsZBRBAUHLHXS5Hd9f6U8iFzm145R2GKn80SKjMN6NrK9IGcNXIxNB6LcgpgORAZF8GPsc2tYY3YdRKCoTOfu3yal7mN4eyMeKDMJo2eQS4tNBqNSW5xmNSQZE5qDlh1AuuXLjpsiab0R+4XfWQJKNsX/xaZFmTa0OuITPA6FVVo5HJCqZ8IgUo50icuGiyKovRU5f8LBUz1ldO4rMmSLSsZ1lmIQmRBshXzLhObITBpRrHftTE+HKlCjhCjgXhHplWD3S5XL85pBzuoXbgAhXLU52RcSMSCKJEAr7WwlPYP9hIZ6iMD6TZ4WeZFC6DKpWLc4RulaiiRiE7Jf9E0dYiIv4IiSCDFhzQ+Q+ooSTPRFzxPTnFbJ/4rBJYRinLcu28dlylyCuSHL5bchVy9ZnzChxEE9YiI84HdLEngLbXKTVEYUbYlGZvTRYfPwYkceHarcoR+fFW0Vu3tJtRw/WZR3g+YeOi6wtdrhPzA6IJ7u3tbEWEC8Wg82modvN3jAF3NlruyH26CJCMgcqRA4eE3l0iMiCmSJNsLA/mycyI1+kEuvRlr0iWb1Exj5iegsWEg9x2cTCyzxrZMAyFWl0KcKzFo8otRUupZTNP4ucPCOy56DI/OdFXpsq0renSAlsbtqmz2Ejs/XhU7cI/klcowdZZ7k84sboXKYF+8jQvdSey0NjPGetoydx+8KJefo4EZ63KpDesQ+3tEy9vJIMR2kaylu3FCkPdOIizBohLuILC/GqacG0NTKIP8MMCk+/8cit2yIffaU3usWz9YQ1RxKW0dUGwOe5q9P/uRHHI8SX2c1qSdxfMKVOABgqfF9SCcXUFHl7dbBj/OJXRHg3cUsTfEWN7WPuqkA3NouCvYh3IPYdS3h9YN9hwSyUDnC1ajMymI6aCN0kyH2Ehmg0HuHdxYyYvX1Qe8RHnOELHgcgE1phvr9+xii/nXtBXDgVfkMmwxDgVfdeEBfO7sRsyFie76oUlVc1Ntb6lGoe8gOKC6fCb+ZMc2Pj6jUTix2+v04k1f9hIrYBVw3Og6DiOvgq/IaMdchuYdGKbZYbI5fZllHaXL8pcg47d+f2Is1rbo4Rxq9ddxz1I8rdGS2bOXLQQ80+c94UcTOrjXDv4AuLnxw+IbJ8vT7K9OnhV0vvSas3+pe7S1w4FX4zZ2rIhI8k7sbJlm7j/NLPEZ8hc8qA7drJxJI7THfucX8RrSKD3fMI4meZQcZdOjKWvNINX7jtRfQc8B8lWjMyjG/hB6VvFN/WNe7uJ0/gNvnBxO1kykwm362SWR58wIHue5OykylGptq2sjL1UmoqJVPIJb5/LwsRt+3vTMoiA7/D7UNwgNcXH159k1HyhlsXM8L7Grj/MDjNpmnSyxGZzERONijv0D9JmEKv8DBMtbUOQ5E1uGFSeOVtep+Oe30esSB5leo8TvoRAxzlS+2pFHuCcdxt9iLA7b32GxnbNKTMniQyWJ2PVS+7MCo59v4sN7Nlvo44rk/6Nd71Im+rltjo0P4OIsS3yI0gggzYbkellabi9HzH47XJTmiYlioy9UlHlyuAs8yRg0SEm7ECXI23N7ytiLpp0++XrsMTLQ6DiRaewRbOEuFvN2H5HWE2yEScsSNGhg1QkfdqeKioCwGXwzlTceptxtLECfub95yDCL/OQi8iROU5MgYuRmgi4huhfPCQs5X6Vf58FVMNK53SRDjhMzpb/eB9RyaDSJGV44pEJcO6IDQXwQqoqst7xxqY44tlQwkXnVlP4Z8QNZ7ACf8CiHwarc+YZNgYhLj3rIVipddSjv9YbMBBouqyyal7yDfoCY+JDHvIYYs/b70aiwhbBCLDiiA0GAGH+H6mKXz72roX77/luE3WwfX4+vnECJExQ/SLp7auPnkapmvtt+X5RgOToQUQ4uXgXehLUEdbPs3uRJe7D4jwF4RYQgLcAB/O0j/zuf4HwObroXNBJPDYOwDFAmDKQWo44h9AGTrk2x9FqNFkDMaY+5ePlCGf/9DY5VPum+25NPvWDhego92I5kALoBugcDgt40Y6ViCTbYXtMS8m5VlJE2H7EmgBbOfGQ4SG4iLDhugwBC2FTkEyA6rGozEW8UKsRK5/WrCJkpmgb3uarUDmy9B02BlPe7pWfJ9xk7F3BxDnkeY8usb87un4+8goxpzCCd4v08rj3WkG2n4MrcPyYdmLf2RqTOgYAHHledPku91NuVeuKVXhe2izx5FTx0S9jIwNAxcFT3dzuddB1HvL1i45o1jpekOvQpVs2hYKrS81KRXexuew5ETvgQpg5xv4twH9uvN/gu94NEneLBBpBMWYRMivyKk5cSUvBScygHa4G9L3lns56ajjzwLb2DS4e/0Hdm0TMdIqC9kAAAAASUVORK5CYII="
                break;
            case "type_2"://持有产品
                img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADMAAAA5CAYAAACbOhNMAAAAAXNSR0IArs4c6QAACEJJREFUaAXdWmlsVUUUPmUv+1YKlKUs0gKyCEEQ3EpQW0QMAVmiGDVGCJKgfxRN/GFMDJoYEo0N/DBgMKJGjFSURiMWlAYwCiKgyCqyb2WxULDy/L65d27v3Hfvu/e9vlerJzk9s545350zM2emT+R/RFnpxhKLxZpCZz64ANwL3A6cDb4Kvgw+Ct4LPpyVlfU3ZOMiAGgPngV+H3wBHIXYju3Zr/2/jghGFIHXg6+B60PsTz1F9QGVkpth0OEYdAm4xG/wy9UiVXCoi39aXA0HawNH69DW4k5wvHZt/HqqsvX4uxguuDOwRUBFUmAAohP0LAXPBTfROmMxkd9PiOz8DbxP5OQ5XRMsu3cRGX4TeJBI3x4iWaYlN9BzFfhZgKoK1mLWmCrMOiMHIIUoKAPDBItuYMhKfL/yzSIXuLRTpI6YqeIJIuMx302cT6SU4dPIVAD6NYrqSGAApBjKPgB30Ep/wiyUVYicOq9L6i9zO8Pyu0VGYLZcdBHp2QBU7irzTYaCAZB56Pk2mFuuXLsusvIzkZ/5zTJEwzD3jz0g0rKFMwC38KcBaLlT4pNICMaekXXop4CcvSCy/GORE2d9NKW5qEdXkXkzRLp2dBQT0JREMxQIxl4jW6BAudbBYxYQ7kwNRdwB5wNQvzxnRLrcuKA1ZC43uw+AcNfiYldA9Iw0JBCawvGWwRM4vk20p8y2T5c50hcMapeC1a7FNULXamgg2kKOy/Fph020i/bFURwYoOaByHNEERd7Q6wRPZ6f5Pi0w0VzbTtdRa6Dz1W6BGkFkttvJnct15ihSdpBe2yifbTTIGNmgLYItSpE4YFYVmG0jZzJbiXCM4MnO0OYdBHtoV02ldj26rw0c1JW4jmd58mezIHYMwfbzDCR0UPiATA6+OWgyK4DkIdErv+lR6mTrVriK04Q2bDNiufqaupStId23T7SKaO93+icszUDZXsUngG3YKz1Uml4iDKkv8gdo6zBx4+AbzratPp4WYvT4iTWAOO3qzWIyeAbOThL+uPm0xyf9p1PRbYnCF4Y+ryywInluC3kYKu+xJHcM0P3Umcug8YosRZBDxtINdGpGY7fXrkW+/UaAFCJwNAu2pffU/WmvbT7Q+bca+ZBFpAY/UahQ8fhwwCUTuIMhZHHPsduBQYuxnBlslbCMD4K1VzDtk3HTCPldYN7NE+s0GPfZNt+Z2b6oXsHquDFKsp9RA938KhOpUc2xee1XShQIe2jnTbR7nymtZsVMEPiDTEZOpBmMBy7f164BR47lf0ajNOdV91kiAFouinKuvHYqVaaBoMNzyJPI10cKM8jjo2y8wUq8KlglBy2y3vsVPZrMDizLaq+olPRZbrXTXZLkR44hBORJ/BV9mswTpDNUCRZysi6CdmiWwOwi9TlXYNxNti2rV1NIiYzsW54eCYij53K/ngw2YlU+NcdO2XcN/wbJVkatqO1Mz/6aarX4YyzwYb5qp9NjAIOIxooyDdrGVDuQYDJ+4g+FxiQDh0g0omRYALil+fh6ReUsltuF6MzRrfBIFDbh1MU31dyibh7VysYNJqHZOhqGgwNKK8U2fhD8Iz16S4yslBkINyJABk1k7gz7kZ0/dWWYCBs73oRPQ3797OvnhmmN4JnMjGoTwpg7Lk9ik+yYm349eHISRGyJgagJEbVYTSor9Fig87pNcN8hS7ku1WypIPOMnySZO5BehyCiAKE7Xn1cNHXOu0Gsw6F6rsU5ot066ybRJM66AxbuNG0BbeiXYP7OfU3kPpS5xww8Ls/UIirkXXxuWu0bhJd8vCMEopE1xjfcuKtzsWMlWth9xHdygFjF7ypK3gFTvb+zsOT9/4oN049TjKSi37szUaPN9w5AwxQbkLldjbgO+/Me91Nw9Pc0diPN8lM0CzYw6u1TVth72adoTTA2BULIdX9ka/xnhd5u4m/0EFnJlxt9GBs5SrQV2PTvsVeK+LAAG0lGi3TDWcXG4/XujhQcnbSDYYH7EP3GEOWws4KowSZODB2gxcgjzPNQ3QBTp82reyaEFG5Aw8OqmdIw4jVjAQWzhZxxWKH0PV5v+6B1wZEBNg31JsU1Inwi5d+JMItuKGIUcGiOSK9ES3YVAM5ybtWdGUgGDYAoKkQn4DV+XzqnPUqf6aKtZmlHPwf4slpInzgsKkWcjqAlOkCr0wIho0BaD5EKVi1vYJvsxLqGEBmirjpPHI/fglhx2sYhwv+UQB5L9GYoWDYGYCmQ7wLxk5v0Y69ImsQSFRd0iX1l13wzjLlTpExQw1d+KeGPBUGhD0igWFDABoJwSnuzTyJ0fGmH/H+i0V/uh6uxyfXSWPxhnwLIl874LRGEEbDdK2ddj6hiAyGWgAIlwN5Dfw42Oi7H8HQFgy5bbfxUo9m/kQAPDdGFVr/5vP8DoCdVoPnA0jkuTcM8h82vhSguNO9BaY06IvvRMiJiK/4PL8CqALl/IXG1oD6wOKgcyawAysw0DaIceAS8BowHM6i+24zdiBd7MjOWBfTJjpZnWD/9eAS6C5KBQgVpQSGHTFgDFwOnoFsHljNR1P4/FzsRJ5fWrCLoocBn/GbTQcgnwDnQs9k6tMVqciUwbgHgxFnkOc6usJyBprF45kyiQu8IN8p491pDvquANdj+3D0pT4zdSqsFAzizvOiLve6m3KvIl2r5Ovo871RUs9MWmbGZQM3BV9387jXHrR72dWvcSax0w0EV4MVff5tLLa6XOeUrMXfMY3Teh+rYOwibX4tTK8xfyf4qk+XxlsEIE3AmJM42oWSuoir8UIwLYPRhrsh/99yLxOOCn+ecc1Nxt3rH8+DMWWYwCYKAAAAAElFTkSuQmCC"
                break;
            case "type_3"://收藏产品
                img.src = "data:image/png;base64,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"
                break;
            case "type_4"://选中产品
                img.src = "data:image/png;base64,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"
                break;
            default://默认产品
                img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADMAAAA5CAYAAACbOhNMAAAAAXNSR0IArs4c6QAABtxJREFUaAXdWmlsVUUUPmVpsFBARPbaSqEgJkUWYwmtpGqKgoJIVFA0ChoSYvjjHysR/2iIPzWRuCSaQIwKBQJBXBBBJYJhMYJB2ZSlIiCyC22hPL9v7j3z7r3v9vH6urz7PMnpmTmzfd+bc2fmzq3I/0hyWptLLBbrgD6LoMOgg6D50DzoJegFaC10L/RQTk7ONdhoCQjkQadBl0BPQ1MR1mN9tiPZzApAlEFXQS9BWyJsz37KWsIorTDDoMUYdBH00bDBLyKgziKgqOcuily8LNLtBpEe3UR6Iuio3Zqei+XosxoheDCs72S+ZpEBCUJ4HToPmuvtuPaEyM/7HD32t7ckPD3gZpGRJY4O6ptQpwGexdAFIMVnLSVJmQyIDESPa6CjtedYTGT7HpHPvhc5dVa9zbe9e4pMrhAZO0Ikx49oJ3qbAkJ/ptKrv2kTLUBkDIpIZIBW2XdYZNVGkaPH1dNyW9BPZFqlSEmhr69jyJHQDp83JHNdMiAyBe0+gSLqRa42IvOlyNZdzLWNlJWKzJgo0qmj7Z+hNhOE+IM2KUnJgAhDajPUEOGD/P4KkYPcKdpYirFDPT/dWTjcoTC6lIMQQy9UmiQDIn3QYju0gC1PnMYTuUzknxY8G+ynOXITnqV5j4n07WVbHUVqLAidtB5Pgrt1goBIZzhroIbIv/hN2psIQfGH47gc3xXiqXHxqc/aUDIofRVawVrXcOD4YHX7zgjHVSEhjk8crhAX8SVIQpiBdX/UOgDNY+0VG0Q2bmMqs1J5p8j0ey0GLghDEG5/WQ8SYTND1obIISyKUSBCwMRBPK4Q30LNqPWRwawMRcEcLVy9SVPRsAE8z7l4LTgfGXhfhnZi6a9/iOw/wlR0hHiIyxXiJF4rlgxYsnCqlqz9TlPRsgFcU13cBqQlg1w59EZ6ec467Hu06I2GEJfnHEi8xG3ES4bHFiO792sqmjaAz+IOJ8OFOcKy24/PTwZxx6NLMfHX403iAA8NERbiI05Xil38dp8ZpiVnzvt2W3VHyvI0QJwewWtefNMcrAV8zc0GCeA0UaXPTA8lEKik7sjZAM7uBKhkcNXgyPksmZkATlyRxMnUu1yC7+DqjpwN3BUY/DozpxRtV3PE1Fx0beCq6iSRKhl7OZSfJWTyu/p+aINfydiZ4UVdNkh3PxnfzOwBgaskwcu5LrnRpkN8xOlKI6w5E5iZwRsb17CfWNgBnsGDmIquDClwcLoIdwC/2UI1zOj/VuGX3KKpaNrAJeE3itJLZqM6x94O5gm3A1qaWcsl+Q57+DJYLG4vmfUoMm/ZvKUvNaedzAIPG51EetnzivByeJPWs2QQd1fgfFcLJvB2OYLCWxqPLAZue362ZNwK78GSlAzFczNisOuNiBlehMVpoAVTh9Q7NoeEjwxYcto+1AqPV4l0Ntcb6smczcUd68z7feMvAV6zWarXR8Z1VsOaSrzrnVSuVTNrp0wQIR5XuMkv0IzaBDJgexqFL2qF++4SGTVcc5mxpbjNu9v/DM8HTntqUVQJZFiAikthvnDSIk8/KHJrPFbpbjfhBvksLsA8W8Ua4Ps4DEAoGbfiDFgec8xzMxffSgr7uyXtZAr6inBcz3P7G4ae09TwSbdGXBQUouFWaD92cAWnt6VrRXayyzaWMbeJPDkJX4H5ccWRWpjxmJUj6gjapGRYGYQYrZ9DzdGOH2XX/wjHZocc67Sm8Gz4cKXIPf79hM9xBYiYSGlqvOuSYUMQKoLBnAgOOo7wu0nN1yKBOywtTstyd+eq1Sf+pYz9kMAjILL3ep2mRIadgBAvDT6F+lZ7XmZvxnmb/wPAj7fNlY6YCW7OVeNCF5nl6G82iKR0M5EyGYIEIdZ/BvoGNP5GgQw/3m77RWQdwu9yPRxJhKE0vAj/UIAln2fAvC4JlRlWC0Hi7YSSJI5mkdF+QIrb12vQudBO6qfdskvko3VeT2L6IYTSRMxEiNTB9yZ0EYicCylP6sJv1HzBQGehL6AldgHzjeR37WVcqfOraz5oudxyIw7IfuT54wxFvy+lQ4T9pUWGDSkY9Dh0EZJDoMvoozzxgG9JdZz4y/CaNVmEz4krP8CORh8l0FegtVqQjo13m05rtw1AYMEWzpQ5YvB9g8trUKrKRAb2sd5LSD2Ftlg+WkdahQyhABQPp/MVVsUofFZgELrSrzeWwfGaM5b/sWTD01eSZqbVyHB8gOOZaY2Txg6OcONRhK+6s7Cbe/4XZgvqvMV6kRasdAOgZ6BG1m+NxVZu0JyxdfiLRTlLBGBnK/zGxlis4YrmjK3OEhpxmID9lY+Ck9kBg8DLMgHoQugFqEoDEiPbksZ/r6SG5+1BL20AAAAASUVORK5CYII="
                break;
        }
        console.log("图标的宽度", makerW / that.scale / 2, "对应的缩放比例是", that.scale)
        img.onload = function () {
            if (type == "type_4") {
                ctx.drawImage(this, 0, 0, selectedMakerW, selectedMakerH, (x * currentScale - selectedMakerW / that.scale / 2), (y * currentScale - selectedMakerH / that.scale), selectedMakerW / that.scale, selectedMakerH / that.scale)
            } else {
                ctx.drawImage(this, 0, 0, makerW, makerH, (x * currentScale - makerW / that.scale / 2), (y * currentScale - makerH / that.scale), makerW / that.scale, makerH / that.scale)
            }
        }

    }
    /**
     * 绘制标记
     */
    drawMarker(pos) {
        let series = this.series,
            ctx = this.ctx,
            currentScale = 1,//scale放大是对于坐标系的放大，点的实际坐标也相应的放大对于倍数即可
            that = this
        for (let i = 0; i < series.length; i++) {
            let seriesObj = {},//mapDataArr 的每一个元素
                obj = this.dataToXY(series[i].data)  //x,y轴坐标信息
            seriesObj = {
                i: i,//分组序号
                type: "type_" + i,
                data: obj
            }

            for (let j = 0; j < series[i].data.length; j++) {
                if (pos && i == pos.i && j == pos.j) {
                    that.createMaker(obj[j].x, obj[j].y, "type_4")
                } else {
                    that.createMaker(obj[j].x, obj[j].y, seriesObj.type)
                }
                //console.log(j, obj[j].x, obj[j].y, seriesObj.type)
                ctx.beginPath();
                ctx.fillStyle = "red"
                ctx.arc(obj[j].x * currentScale, obj[j].y * currentScale, 2, 0, Math.PI * 2, false);
                //ctx.arc(obj[j].x * (currentScale+1)/2, obj[j].y * (currentScale+1)/2, 5, 0, Math.PI * 2, false);
                ctx.fill();

            }
            that.mapDataArr.push(seriesObj);
        }
        console.log("当前放大倍数是：", currentScale, "mapData", this.mapDataArr)

    }

    clearMap(pos) {
        let that = this,
            obj,
            item,
            //currentScale = this.scale,
            ctx = this.ctx;
        ctx.clearRect(0, 0, that.W, that.H)

        this.drawX();
        this.drawY();
        this.drawMarker(pos);

        if (pos) {
            item = that.mapDataArr[pos.i]
            obj = item.data[pos.j]
            ctx.save();
            //obj是一个点的所有信息
            that.drawCrossLine(obj)
            //点击点的特殊绘制在drawMaker中完成，此处可不处理
            //that.createMaker(obj.x, obj.y, "type_4")

            //ctx.scale(1.2, 1.2);
            ctx.restore();
        }
    }
    //画十字线
    drawCrossLine(obj) {
        let ctx = this.ctx,
            that = this,
            H = this.H,
            W = this.W,
            currentScale = that.scale,
            xLength = this.W,
            xl = this.xAxis.data.length,//被分成多少段
            xs = xLength / xl,
            { x, y, xVal, yVal } = obj


        ctx.save()
        ctx.lineWidth = 3
        ctx.strokeStyle = "rgba(252,121,70,0.2)";
        ctx.beginPath()
        ctx.setLineDash([])//切换实线
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, H - that.paddingTop - that.paddingBottom)
        ctx.stroke()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(W, y + 0.5)
        ctx.stroke()

        //对应坐标轴的坐标值标注
        //ctx.font = ''
        ctx.fillText(xVal, x, H - that.paddingTop - 10)
        ctx.fillText(yVal, xs - 10, y)



        ctx.restore()

    }


    /** 
     * window坐标转canvas坐标
     */
    windowToCanvas(canvas, x, y) {
        let box = canvas.getBoundingClientRect();
        return {
            x: x - box.left - (box.width - canvas.width / 2) / 2,
            y: y - box.top - (box.height - canvas.height / 2) / 2
        };
    }
    animate() {
        var that = this,
            ctx = this.ctx,
            start = new Date(),
            time = 0,
            item, obj, h, r, isStop = true;
        (function run() {
            ctx.save();
            ctx.clearRect(0, 0, that.W, that.H);
            // 画坐标系
            that.drawAxis();
            // 画标签
            that.drawTag();
            // 画y轴刻度
            that.drawY();
            ctx.translate(that.padding, that.H - that.padding);
            ctx.shadowBlur = 1;
            isStop = true;
            time = new Date() - start;
            for (var i = 0, l = that.animateArr.length; i < l; i++) {
                item = that.animateArr[i];
                if (item.hide) continue;

                item.isStop = true;
                ctx.strokeStyle = item.color;
                ctx.shadowColor = item.color;

                for (var j = 0, jl = item.data.length; j < jl; j++) {
                    obj = item.data[j];
                    ctx.beginPath();
                    if (obj.r > obj.radius) {
                        r = obj.r - obj.v * time / 1000;
                        if (r < obj.radius) {
                            obj.r = obj.radius;
                        }
                    } else {
                        r = obj.r + obj.v * time / 1000;
                        if (r > obj.radius) {
                            obj.r = obj.radius;
                        }
                    }
                    if (obj.r != obj.radius) {
                        obj.r = r;
                        item.isStop = false;
                    }
                    if (obj.p > obj.h) {
                        h = obj.y - 10 * time / 1000;
                        if (h < obj.h) {
                            obj.y = obj.p = obj.h;
                        }
                    } else {
                        h = obj.y + 10 * time / 1000;
                        if (h > obj.h) {
                            obj.y = obj.p = obj.h;
                        }
                    }
                    if (obj.y != obj.h) {
                        obj.y = h;
                        item.isStop = false;
                    }
                    var gradient = ctx.createRadialGradient(obj.x, -obj.y, 0, obj.x, -obj.y, obj.r);
                    gradient.addColorStop(0, 'hsla(' + item.hsl + ',70%,85%,0.7)');
                    gradient.addColorStop(1, 'hsla(' + item.hsl + ',70%,60%,0.7)');
                    ctx.fillStyle = gradient;
                    ctx.arc(obj.x, -obj.y, 20, 0, Math.PI * 2, false);
                    ctx.fill();
                    ctx.stroke();
                }
                if (!item.isStop) { isStop = false; }
            }
            ctx.restore();
            if (isStop) {
                return;
            }
            requestAnimationFrame(run);
        }());
    }

}
