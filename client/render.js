if (com.p7.render == undefined) {
    com.p7.render = {};
}

com.p7.render.Render = Class.extend({
    // 
    init: function (app, scale, data, config) {
        this.app = app;
        this.data = data;
        this.scale = scale;
        this.c = config;
    },
    
    // Render data according to data, into scale
    render: function (data) {
        throw 'Abstract function';
    },
    
    // Get color
    color: function (name, i, alpha) {
        if (name) {
            var color = $.extend({},com.p7.style.colors[name],true);
            color.a = alpha;
            
            if (i>0) {
                color.darken(i*10);
            }
            
            return color;
        }
        return com.p7.style.Color(200,200,200,alpha);
    },
    
    // Normalize an angle (in radians)
    normalize_angle: function (r) {
        while (r < 0) {
            r+=Math.PI*2;
        }
        return r % (Math.PI*2)
    }
});

com.p7.render.ArcBar = com.p7.render.Render.extend({
    
    // Draw an arc bar at radius, from-to. From and To are specified in fractions of 360deg
    _segment: function (radius, from, to, width) {
        var ctx = this.app.ctx;
        ctx.save();
        
        ctx.beginPath();
        
        // Start angle in radians
        var start = (this.c.angle/360.0)*Math.PI*2;
        // Size in radians
        var size = (this.c.arc/360)*Math.PI*2;
        
        // Draw an arc from-to
        // We rotate back 90deg (so we start from 12 oclock), then forward start angle, then to From
        ctx.rotate(-Math.PI/2+start+size*from);
        // Draw arc to end
        ctx.arc(0,0,radius,0,size*(to-from));
        // Rotate to end because we're lazy
        ctx.rotate(size*(to-from));
        // Draw line outwards
        ctx.lineTo(radius+width);
        // Arc backwards
        ctx.arc(0,0,radius+width,0,-size*(to-from),1);
        // Rotate back because we're SO lazy
        ctx.rotate(-size*(to-from));
        // Draw line inwards
        ctx.lineTo(radius,0);
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    },
    
    _label: function (radius, fraction, label) {
        var ctx = this.app.ctx;
        ctx.save();
        
        // Start angle in radians
        var start = (this.c.angle/360.0)*Math.PI*2;
        // Size in radians
        var size = (this.c.arc/360)*Math.PI*2;
        
        // Draw an arc from-to
        // We rotate back 90deg (so we start from 12 oclock), then forward start angle, then to From
        var position = this.normalize_angle(-Math.PI/2+start+size*fraction);
        ctx.rotate(position);
        ctx.font = '800 9px Arial';
        ctx.fillStyle = 'rgba(250,230,180,1.0)';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        
        ctx.translate(radius+this.c.width/2,0);
        
        // Check to see if we've rotated upside-down
        if (position > 0 && position < Math.PI) {
            ctx.rotate(-Math.PI/2);
        } else {
            ctx.rotate(Math.PI/2);
        }
        
        // Commented section renders a dim background box around the text to make it
        // easier to read
        //var w = ctx.measureText(label).width;
        //ctx.fillStyle = 'rgba(0,0,0,0.4)';
        //ctx.fillRect(-w/2-3,-4,w+6,8);
        ctx.fillStyle = 'rgba(100,100,100,1.0)';
        ctx.fillText(label, 0,0);
      
        ctx.restore();  
    },
    
    _label_flat: function (x,y,label,v, markpath) {
        var ctx = this.app.ctx;
        ctx.save();
        
        ctx.font = '800 9px Arial';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
 
 
        if (markpath) { 
            ctx.beginPath();       
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.moveTo(markpath[0][0]+0.5,markpath[0][1]+0.5);
            for (var i = 1; i<markpath.length; i++) {
                ctx.lineTo(markpath[i][0]+0.5,markpath[i][1]+0.5);
            }
            
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(markpath[0][0]-1, markpath[0][1]-1,3,3);
            ctx.fillRect(markpath[markpath.length-1][0]-1, markpath[markpath.length-1][1]-1,3,3);
        }
        ctx.translate(x,y);
        
        if (x<0) {
            ctx.textAlign = 'right';
        } else {
            ctx.textAlign = 'left';
        }
        
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText(label + " " + v, 0,0);
      
        ctx.restore();  
    },
    
    render: function () {
        var ctx = this.app.ctx;
        ctx.save();
        if (this.c.x && this.c.y) {
            ctx.translate(this.c.x, this.c.y);
        }
        
        // Render background
        
        ctx.save();
        
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = 1;
        
        this._segment(this.c.radius,0,1.0, this.c.width);
        
        ctx.restore();
        
        ctx.save();
        ctx.lineWidth = 1;
        
        var values = this.data.smooth_values();
        var attrs = this.data.attributes();
        var offset = 0;
        this.scale.update_limit(this.data.full_sum());
        var status_v = this.scale.scale(this.data.sum());
        
        if (this.c.alarm && status_v > this.c.alarm) {
            this.status = 'alarm';
        } else if (status_v > 0.8) {
            this.status = 'warn';
        } else {
            this.status = 'ok';
        }
        
        ctx.save();
        // Render each value stacked on the other
        for (var i=0; i<values.length; i++) {
            //console.log(this.color('ok',0,1).toString());
            /*
            if (this.status == 'alarm') {
                var intensity = (3+2*(Math.sin(new Date().getTime() /500)))/10;
                ctx.fillStyle = this.color(this.status,i,intensity/2).toString();
                ctx.strokeStyle = this.color(this.status,i,intensity/4).toString();
            } else {
                ctx.fillStyle = this.color(this.status,i,0.25).toString();
                ctx.strokeStyle = this.color(this.status,i,0.25).toString();
            }
            var hdr_rad = Math.max(this.c.radius-2,0);
            var hdr_width = this.c.width + 4 + Math.min(this.c.radius-2,0);
            var hdr_start = this.scale.scale(offset);
            var hdr_end = this.scale.scale(values[i]+offset);
            if (i==0) {
                hdr_start -= 0.01;
            }
            if (i==values.length-1) {
                hdr_end+= 0.01;
            }
            
            this._segment(hdr_rad, hdr_start, hdr_end, hdr_width);
            */
            
            
            if (this.status == 'alarm') {
                var intensity = (3+2*(Math.sin(new Date().getTime() /500)))/10;
                ctx.fillStyle = this.color(this.status,i,intensity).toString();
                ctx.strokeStyle = this.color(this.status,i,intensity/2).toString();
            } else {
                ctx.fillStyle = this.color(this.status,i,0.8).toString();
                ctx.strokeStyle = this.color(this.status,i,1.0).toString();
                ctx.lineWidth = 2;
            }
            ctx.shadowColor = this.color(this.status,i,0.8).toString();
            ctx.shadowBlur = 8;
            
            this._segment(this.c.radius, this.scale.scale(offset), this.scale.scale(values[i]+offset), this.c.width);
            offset += values[i];
        }
        
        ctx.restore();
        
        if (this.c.labelx) {
            this._label_flat(this.c.labelx, this.c.labely, this.c.label, this.scale.label(this.data.sum()), this.c.markpath);
        }
        /*
        if (this.c.width > 20) {
            this._label(this.c.radius, 0.5, this.scale.label(this.data.sum()));
        }
        */
        
        ctx.restore();
        
        ctx.restore();
    }
})