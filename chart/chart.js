
function calculateNum(arr, isMin) {
    if (!arr || !arr.length) {
        return { num: 0, step: 0, min: 0, max: 0 };
    }
    var high = Math.max.apply(this, arr),
        low = Math.min.apply(this, arr),
        num = 0,
        max = 0,
        min = 0,
        pow, sum, step, absLow, i, j, k = 0;
    outer:
    for (i = 0; i < 10; i++) {
        pow = Math.pow(10, i);
        for (j = 1; j <= 10; j++) {
            sum = pow * j;
            if (sum > high) {
                max = sum;
                break;
            }
        }
        if (!max) continue;
        if (i < 2 || j > 4) break;
        for (k = 0; k < 10; k++) {
            if (max - pow / 10 * (k + 1) <= high) {
                max -= pow / 10 * k;
                break outer;
            }
        }
    }
    num = j;
    if (num < 4) {
        if (max % 4 == 0) { num = 4; }
        if (max % 3 == 0) { num = 3; }
    }

    step = Math.round(max / num * 100) / 100;

    if (low < 0) {
        absLow = Math.abs(low);
        num++;
        min += step;
        while (min < absLow) {
            num++;
            min += step;
        }
        min = -min;
    }

    if (isMin) {
        var l = num,
            m = 0;
        for (var i = 1; i < l; i++) {
            var n = min + i * step;
            if (low < n) {
                break;
            }
            m = n;
            num--;
        }
        min = m;
    }

    return {
        num: num,
        step: step,
        min: min,
        max: max
    }
}
/**
 * 图表基类
 */
class Chart {
    constructor(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.W = 1000;
        this.H = 600;
        this.padding = 120;
        this.paddingTop = 50;
        this.title = '';
        this.legend = [];
        this.series = [];
        this.xAxis = {};
        this.yAxis = [];
        this.animateArr = [];
        this.info = {};
        this.drawing = false;
    }
    init(opt) {
        Object.assign(this, opt);
        if (!this.container) return;
        //通过缩小一倍，解决字体模糊问题
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
        this.create();
        this.bindEvent();
    }
    showInfo(pos, title, arr) {
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

/**
 * 散点图
 */
class Point extends Chart {
    constructor(container) {
        super(container);
    }
    bindEvent() {
        var that = this,
            ctx = that.ctx,
            canvas = that.canvas,
            xl = this.xAxis.data.length,
            xs = (that.W - 2 * that.padding) / xl,
            index = 0;

        if (!this.series.length) return;
        this.canvas.addEventListener('mousemove', function (e) {
            var isLegend = false;
            var box = canvas.getBoundingClientRect();
            var pos = {
                x: e.clientX - box.left,
                y: e.clientY - box.top
            };
            // 分组标签
            for (var i = 0, item, len = that.legend.length; i < len; i++) {
                item = that.legend[i];
                ctx.beginPath();
                ctx.arc(item.x, item.y, 20, 0, Math.PI * 2, false);
                if (ctx.isPointInPath(pos.x * 2, pos.y * 2)) {
                    canvas.style.cursor = 'pointer';
                    isLegend = true;
                    break;
                }
                canvas.style.cursor = 'default';
            }

            if (isLegend) return;
            // 鼠标位置在图表中时
            if (pos.y * 2 > that.padding + that.paddingTop && pos.y * 2 < that.H - that.padding && pos.x * 2 > that.padding && pos.x * 2 < that.W - that.padding) {
                canvas.style.cursor = 'pointer';
                // 获取处于当前位置的信息
                var arr = [],
                    title;
                for (var i = 0, item, l = that.animateArr.length; i < l; i++) {
                    item = that.animateArr[i];
                    if (item.hide) continue;
                    arr = [];
                    for (var j = 0, obj, jl = item.data.length; j < jl; j++) {
                        obj = item.data[j];
                        ctx.beginPath();
                        ctx.arc(that.padding + obj.x, that.H - that.padding - obj.h, 20, 0, Math.PI * 2, false);
                        if (ctx.isPointInPath(pos.x * 2, pos.y * 2)) {
                            title = obj.name + ' ' + item.name;
                            for (var v in obj) {
                                if (!that.desc[v]) continue;
                                arr.push({ name: that.desc[v], num: obj[v] });
                            }
                            that.clearGrid({ i: i, j: j });
                            break;
                        }
                    }
                    if (arr.length) {
                        break;
                    }
                }

                if (arr.length) {
                    that.showInfo(pos, title, arr);
                } else {
                    that.clearGrid();
                    that.tip.style.display = 'none';
                }
                //画十字架和投影到坐标的信息
                that.drawLine(pos);
            } else {
                that.clearGrid();
                that.tip.style.display = 'none';
            }

        }, false);

        this.canvas.addEventListener('mousedown', function (e) {
            e.preventDefault();
            var box = that.canvas.getBoundingClientRect();
            var pos = {
                x: e.clientX - box.left,
                y: e.clientY - box.top
            };
            for (var i = 0, item, len = that.legend.length; i < len; i++) {
                item = that.legend[i];
                ctx.beginPath();
                ctx.arc(item.x, item.y, 20, 0, Math.PI * 2, false);
                if (ctx.isPointInPath(pos.x * 2, pos.y * 2)) {
                    that.series[i].hide = !that.series[i].hide;
                    that.create();
                    break;
                }
            }
        }, false);
    }

    create() {
        // 组织数据
        this.initData();
        // 画坐标系
        this.drawAxis();
        // 画y轴刻度
        this.drawY();
        // 画标签
        this.drawTag();
        // 执行动画
        //this.animate();
    }
    initData() {
        var that = this,
            xdis = this.W - this.padding * 2,
            ydis = this.H - this.padding * 2 - this.paddingTop,
            xl = this.xAxis.data.length,
            xs = xdis / xl,
            xmin = this.xAxis.data[0],
            xmax = this.xAxis.data.slice(-1)[0],
            min, max, numMin, numMax, item, obj, arr = [],
            numArr = [],
            index = 0,
            r, h;

        if (!this.series.length) return;
        for (var i = 0; i < this.series.length; i++) {
            item = this.series[i];
            if (!item.data || !item.data.length) {
                this.series.splice(i--, 1);
                continue;
            }
            // 赋予没有颜色的项
            if (!item.color) {
                var hsl = i % 2 ? 180 + 30 * (i - 1) : 30 * i / 2;
                item.color = 'hsla(' + hsl + ',70%,60%,1)';
                item.hsl = hsl;
            }
            item.name = item.name || 'unnamed';

            if (item.hide) continue;
            item.data.forEach(d => {
                arr.push(d.yVal);
                numArr.push(d.num);
            });
        }

        numMax = Math.max.apply(null, numArr);
        numMin = Math.min.apply(null, numArr);

        // 计算数据在Y轴刻度
        this.info = calculateNum(arr, true);
        min = this.info.min;
        max = this.info.max;

        for (var i = 0; i < this.series.length; i++) {
            item = this.series[i];
            if (!this.animateArr[i]) {
                obj = Object.assign({}, {
                    i: index,
                    isStop: true,
                    create: true,
                    hide: !!item.hide,
                    name: item.name,
                    color: item.color,
                    hsl: item.hsl,
                    data: []
                });

                item.data.forEach((d, j) => {
                    h = Math.floor((d.yVal - min) / (max - min) * ydis + 2);
                    r = getRadius(numMax, numMin, d.num);
                    obj.data[j] = d;
                    obj.data[j].h = h;
                    obj.data[j].p = h;
                    obj.data[j].x = Math.floor((d.xVal) / (xmax) * xdis + 2);
                    obj.data[j].y = h;
                    obj.data[j].radius = r;
                    obj.data[j].r = 0;
                    obj.data[j].v = r / 20;
                });
                this.animateArr.push(obj);

            } else { //更新				
                if (that.animateArr[i].hide && !item.hide) {
                    that.animateArr[i].create = true;
                } else {
                    that.animateArr[i].create = false;
                }
                that.animateArr[i].hide = item.hide;
                that.animateArr[i].i = index;
                item.data.forEach((d, j) => {
                    r = getRadius(numMax, numMin, d.num);
                    h = Math.floor((d.yVal - min) / (max - min) * ydis + 2);
                    if (that.animateArr[i].create) {
                        that.animateArr[i].data[j].p = h;
                        that.animateArr[i].data[j].y = h;
                        that.animateArr[i].data[j].r = 0;
                    }
                    that.animateArr[i].data[j].radius = r;
                    that.animateArr[i].data[j].v = r / 20;
                    that.animateArr[i].data[j].h = h;
                });
            }
            if (!item.hide) { index++; }
        }

        function getRadius(numMax, numMin, num) {
            var r1 = Math.ceil(num / numMax * xs / 3);
            var r2 = Math.ceil(num / numMin * 6);
            return Math.max(r2 > xs / 4 ? r1 : r2, 6);
        }
    }
    drawAxis() {
        var that = this,
            ctx = this.ctx,
            W = this.W,
            H = this.H,
            padding = this.padding,
            paddingTop = this.paddingTop,
            xdis = this.W - this.padding * 2,
            xl = this.xAxis.data.length,
            xs = xdis / xl;

        ctx.fillStyle = 'hsla(0,0%,30%,1)';
        ctx.strokeStyle = 'hsla(0,0%,20%,1)';
        ctx.lineWidth = 1;
        ctx.textAlign = 'center';
        ctx.textBaseLine = 'middle';
        ctx.font = '24px arial';

        ctx.clearRect(0, 0, W, H);
        if (this.title) {
            ctx.save();
            ctx.textAlign = 'left';
            ctx.font = 'bold 40px arial';
            ctx.fillText(this.title, padding - 50, 70);
            ctx.restore();
        }
        if (this.yAxis && this.yAxis.name) {
            ctx.fillText(this.yAxis.name, padding, padding + paddingTop - 30);
        }

        // x轴
        ctx.save();
        ctx.beginPath();
        ctx.translate(padding, H - padding);
        ctx.moveTo(0, 0);
        ctx.lineTo(W - 2 * padding, 0);
        ctx.stroke();
        // x轴刻度
        this.xAxis.data.forEach((num, i) => {
            var x = xs * (i + 1),
                txt;
            ctx.beginPath();
            ctx.strokeStyle = 'hsla(0,0%,20%,1)';
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 10);
            ctx.stroke();
            if (that.xAxis.formatter) {
                txt = that.xAxis.formatter.replace('{value}', num);
            }
            ctx.fillText(txt, x, 40);

            ctx.beginPath();
            ctx.strokeStyle = 'hsla(0,0%,80%,1)';
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 2 * padding + paddingTop - H);
            ctx.stroke();

        });
        if (this.xAxis.name) {
            ctx.textAlign = 'left';
            ctx.fillText(this.xAxis.name, W - 2 * padding + 20, 0);
        }
        ctx.restore();

        // y轴
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'hsl(220,100%,50%)';
        ctx.translate(padding, H - padding);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 2 * padding + paddingTop - H);
        ctx.stroke();
        ctx.restore();
    }
    drawY() {
        var padding = this.padding,
            xdis = this.W - padding * 2,
            ydis = this.H - padding * 2 - this.paddingTop,
            yl = this.info.num,
            ys = ydis / yl,
            ctx = this.ctx;

        // y轴
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'hsl(220,100%,50%)';
        ctx.translate(padding, this.H - padding);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 2 * padding + this.paddingTop - this.H);
        ctx.stroke();
        ctx.restore();

        //画Y轴刻度
        ctx.save();
        ctx.fillStyle = 'hsl(200,100%,60%)';
        ctx.translate(padding, this.H - padding);
        for (var i = 0; i <= yl; i++) {
            ctx.beginPath();
            ctx.strokeStyle = 'hsl(220,100%,50%)';
            ctx.moveTo(-10, -Math.floor(ys * i));
            ctx.lineTo(0, -Math.floor(ys * i));
            ctx.stroke();

            if (i > 0) {
                ctx.beginPath();
                ctx.strokeStyle = 'hsla(0,0%,80%,1)';
                ctx.moveTo(0, -Math.floor(ys * i));
                ctx.lineTo(xdis, -Math.floor(ys * i));
                ctx.stroke();
            }

            ctx.textAlign = 'right';
            var dim = Math.floor(this.info.step * i + this.info.min),
                txt = this.yAxis.formatter ? this.yAxis.formatter.replace('{value}', dim) : dim;
            ctx.fillText(txt, -20, -ys * i + 10);
        }
        ctx.restore();
        //画数据
    }
    drawTag() {
        var that = this,
            ctx = this.ctx,
            tw = 0,
            item, obj;
        this.legend = []
        for (var i = 0; i < this.series.length; i++) {
            item = this.series[i];
            // 画分组标签
            ctx.save();
            obj = Object.assign({}, {
                hide: !!item.hide,
                name: item.name,
                color: item.color,
                x: that.padding + that.W / 3 + i * 80 + tw,
                y: that.paddingTop + 60,
                r: 20
            });
            this.legend.push(obj);
            ctx.textAlign = 'left';
            ctx.fillStyle = item.color;
            ctx.strokeStyle = item.color;
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, 20, 0, Math.PI * 2, false);
            ctx.globalAlpha = item.hide ? 0.3 : 1;
            ctx.fill();
            ctx.fillText(item.name, obj.x + obj.r + 10, obj.y + obj.r / 2);
            tw += ctx.measureText(item.name).width; //计算字符长度
            ctx.restore();
        }
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
    drawLine(pos) {
        var that = this,
            ctx = that.ctx,
            padding = this.padding,
            xmax = this.xAxis.data.slice(-1)[0],
            xdis = this.W - padding * 2,
            ymin = this.info.min,
            ymax = this.info.max,
            ydis = this.H - padding * 2 - this.paddingTop,
            yNum, xNum, space = 8;

        ctx.save();
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = 'hsla(0,0%,30%,1)';
        // 绘制虚线十字坐标
        ctx.beginPath();
        for (var i = 0; i * space <= xdis; i++) {
            ctx[i % 2 ? 'lineTo' : 'moveTo'](padding + i * space, pos.y * 2);
        }
        for (var i = 0; i * space <= ydis; i++) {
            ctx[i % 2 ? 'lineTo' : 'moveTo'](pos.x * 2, padding + that.paddingTop + i * space);
        }
        // ctx.moveTo(padding,pos.y*2);
        // ctx.lineTo(that.W-padding,pos.y*2);
        // ctx.moveTo(pos.x*2,padding+that.paddingTop);
        // ctx.lineTo(pos.x*2,that.H-padding);
        ctx.stroke();

        // 绘制在xy轴对应的数值
        ctx.fillStyle = 'hsla(0,0%,30%,1)';
        ctx.fillRect(padding - 75, pos.y * 2 - 20, 70, 36);
        ctx.fillRect(pos.x * 2 - 55, that.H - padding + 10, 110, 40);
        yNum = Math.round((ymin + (that.H - padding - pos.y * 2) / ydis * (ymax - ymin)) * 100) / 100;
        xNum = Math.round((pos.x * 2 - padding) / xdis * xmax * 100) / 100;

        ctx.font = '22px arial';
        ctx.textAlign = 'center';
        ctx.textBaseLine = 'middle';
        ctx.fillStyle = 'hsla(0,0%,100%,1)';
        ctx.fillText(yNum, padding - 40, pos.y * 2 + 5);
        ctx.fillText(xNum, pos.x * 2, that.H - padding + 40);
        ctx.restore();
    }
    clearGrid(pos, coord) {
        var that = this,
            obj,
            ctx = this.ctx;

        ctx.clearRect(0, 0, that.W, that.H);
        // 画坐标系
        this.drawAxis();
        // 画标签
        this.drawTag();
        // 画y轴刻度
        this.drawY();

        for (var i = 0, item, il = that.animateArr.length; i < il; i++) {
            item = that.animateArr[i];
            if (item.hide) continue;
            for (var j = 0, jl = item.data.length; j < jl; j++) {
                if (pos && i == pos.i && j == pos.j) continue;
                obj = item.data[j];
                drawPoint(item, obj);
            }
        }

        if (pos) {
            item = that.animateArr[pos.i];
            obj = item.data[pos.j];
            drawPoint(item, obj, true);
        }

        function drawPoint(item, obj, isScale) {
            ctx.save();
            ctx.shadowColor = item.color;
            ctx.shadowBlur = 1;
            ctx.strokeStyle = item.color;
            ctx.translate(that.padding + obj.x, that.H - that.padding - obj.h);
            var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, obj.radius);
            gradient.addColorStop(0, 'hsla(' + item.hsl + ',70%,85%,0.7)');
            gradient.addColorStop(1, 'hsla(' + item.hsl + ',70%,60%,0.7)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            if (isScale) {
                ctx.scale(1.2, 1.2);
            }
            ctx.arc(0, 0, 20, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }
}
