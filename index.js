const svg = d3.select('svg');
const width = +svg.attr('width');
const height = +svg.attr('height');

const margin = {top: 80, right: 20, bottom: 20, left: 100};

const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

// 地理投影和地圖路徑
const projection = d3.geoRobinson()
        .scale(200)
        .center([30, -30])
        .translate([width/2.2, height/2]);

const path = d3.geoPath().projection(projection);

const color = d3.scaleThreshold()
    .domain([0, 1000, 2500, 5000, 10000, 20000, 50000, 100000])
    .range(d3.schemeBlues[9])
    .unknown("#E6E6E6");

const poly = g.append("g");
const line = g.append("g");

let topologyData;
let economyData;
const idMapping = {};
const data = {};

// 更新地圖數據
const updataData = (topology, economy, year) => {
    const filteredData = economy.filter(d => +d[' Year '] === year);
    
    filteredData.forEach(d => {
        const alpha3 = idMapping[d[' CountryID '].padStart(3, '0')];
        d.Year = +d[' Year '];
        d.GNI = +d[' Per capita GNI '];
        d.alpha3 = alpha3;
        data[alpha3] = d.GNI;
    });

    const mouseover = function(d) {
        d3.selectAll(".countries")
            .transition()
            .duration(100)
            .style("opacity", .3)
        d3.select(this)
            .transition()
            .duration(100)
            .style("opacity", 1)
            .style("stroke", "black")
    };
    const mouseleave = function(d) {
        d3.selectAll(".countries")
            .transition()
            .duration(100)
            .style("opacity", 1)
            .style("stroke", "transparent")
        d3.select(this)
            .transition()
            .duration(100)
            .style("opacity", 1)
            .style("stroke", "transparent")
    };

    poly.selectAll("path")
        .data(topojson.feature(topology, topology.objects.world_polygons_simplified).features)
        .join("path")
            .attr("fill", function(d) { 
                return color(d.GNI = data[d.properties.iso3]); })
            .attr("d", path)
            .attr("class", function(d){ return "countries" })
        .on("mouseover", mouseover )
        .on("mouseleave", mouseleave )
        .on("click", function(event, d) {
            // 建議用iso3去找對應的數據
            console.log(d);
        });

};

const dataURL = "Global Economy Indicators.csv";
const polygonsURL = "https://raw.githubusercontent.com/GDS-ODSSS/unhcr-dataviz-platform/master/data/geospatial/world_polygons_simplified.json";
const polylinesURL = "https://raw.githubusercontent.com/GDS-ODSSS/unhcr-dataviz-platform/master/data/geospatial/world_lines_simplified.json";
const isoURL = "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv";

const promises = [
    d3.json(polygonsURL),
    d3.csv(dataURL),
    d3.csv(isoURL)
];

// 載入數據並建立country code和alpha3的對應關係
Promise.all(promises).then(ready);
function ready([topology, economy, iso]) {
    const defaultYear = 1980;
    topologyData = topology;
    economyData = economy;
    
    iso.forEach(entry => {
        idMapping[entry['country-code']] = entry['alpha-3'];
    });
    
    updataData(topologyData,  economyData, defaultYear);

};

// 繪製地球表面
d3.json(polylinesURL).then(function(topology) {
    line.selectAll("path")
        .data(topojson.feature(topology, topology.objects.world_lines_simplified).features)
        .enter().append("path")
            .attr("d", path)
            .attr("class", function(d){ return d.properties.type })
            .style("fill", "none");
});

// 縮放功能
const zoom = true;
if (zoom) {
    var zoomFunction = d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', function(event) {
            poly.selectAll('path')
                .attr('transform', event.transform);
            line.selectAll('path')
                .attr('transform', event.transform);
        });
    g.call(zoomFunction);
}

// 創建圖例
svg.append("g")
    .attr("class", "legendThreshold")
    .attr("transform", "translate(1240, 100)");

const legend = d3.legendColor()
    .labelFormat(d3.format(".0f"))
    .labels(d3.legendHelpers.thresholdLabels)
    .labelOffset(3)
    .shapePadding(0)
    .scale(color);

svg.select(".legendThreshold")
    .call(legend);

// 創建滑動條
var slider = d3.sliderVertical()
    .min(1980)
    .max(2020)
    .step(1)
    .width(100)
    .height(400)
    .tickFormat(d3.format('d'))
    .on('onchange', val => {
        updataData(topologyData, economyData, val);   
    }); 

g.append('g')
    .attr('id', 'slider')
    .attr('transform', 'translate(-30, 30)')
    .call(slider);

let interval;

// 點擊播放按鈕的事件處理程序
const playButtonCLick = () => {
    if (!interval) {
        interval = setInterval(() => {
            const currentValue = slider.value();
            if (currentValue < 2020) {
                slider.value(currentValue + 1);
            }
            else {
                clearInterval(interval);
                interval = null;
            }
        }, 300);
    }
    else {
        clearInterval(interval);
        interval = null;
    }
}

// 創建播放按鈕
const playButton = svg.append('g')
    .attr('id', 'play-button')
    .attr('transform', `translate(${margin.left - 65}, ${margin.top + 460})`)
    .style('cursor', 'pointer')
    .on('click', playButtonCLick);

playButton.append('rect')
    .attr('width', 75)
    .attr('height', 30)
    .attr('rx', 5)
    .attr('ry', 5)
    .attr('fill', '#4CAF50');

playButton.append('text')
    .text('▶ Play')
    .attr('font-size', '16px')
    .attr('x', 10)
    .attr('y', 20)
    .style('fill', 'white');