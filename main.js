
import { Scene, WebGLRenderer, PerspectiveCamera, CylinderGeometry, SphereGeometry, Mesh, MeshLambertMaterial, DirectionalLight, TextureLoader, Color } from 'three'

import {createElement,useState,useEffect,useCallback} from "react"
import {render} from 'react-dom'

import reelImage from "./out1.png"

import reelImage0 from "./Reel/3xBAR.png"
import reelImage1 from "./Reel/BAR.png"
import reelImage2 from "./Reel/2xBAR.png"
import reelImage3 from "./Reel/7.png"
import reelImage4 from "./Reel/Cherry.png"

const reelImages = [reelImage0,reelImage1,reelImage2,reelImage3,reelImage4]

/********************************* settings ***********************************/

const picPerReel = 5
const reelCount = 3
function reelRange(f){
    return [f(0),f(1),f(2)]
}

function definePayTableRules(){
    const pictureHints = ["3xBAR","BAR","2xBAR","7","CHERRY"]
    const lineHints = ["bottom","center","top"]
    const anyLine = { lines: lineHints }
    const same3 = pictureHint => ({text: "3 "+pictureHint+" symbols", pictureHints: [pictureHint] })
    const rule = (opt,lines,payout) => ({...opt,lines,payout})    
    const rules = [   
        { ...same3("CHERRY"), lines: ["top"], payout: 2000 },
        { ...same3("CHERRY"), lines: ["center"], payout: 1000 },
        { ...same3("CHERRY"), lines: ["bottom"], payout: 4000 },
        { ...same3("7"), ...anyLine, payout: 150 },
        { text: "Any combination of CHERRY and 7", pictureHints: ["CHERRY","7"], ...anyLine, payout: 75 },
        { ...same3("3xBAR"), ...anyLine, payout: 50 },
        { ...same3("2xBAR"), ...anyLine, payout: 20 },
        { ...same3("BAR"), ...anyLine, payout: 10 },
        { text: "Combination of any BAR symbols", pictureHints: ["3xBAR","2xBAR","BAR"], ...anyLine, payout: 5 },
    ];
    return ({pictureHints,lineHints,rules})
}

const minDebugBalance = 1
const maxDebugBalance = 5000

const spinCost = 1

/********************************* reels 3D view ***********************************/

function createReelView(){
    
    const picWidth = 140
    const picHeight = 120
    const reelWidth = 1
    const allReelsWidth = reelWidth * reelCount
    const reelEdgeCount = 40
    const tickSize = 0.02
    const winLineThickness = 0.02
    // const reelImage = "out1.png"
    const tickColor = 'red'
    const winLineColor = 'red'
    const sceneBgColor = 'skyblue'    
    const distanceToCamera = 4
    const aspectRatio = 2.4
    const vertFieldOfViewDeg = 25
    
    const reelRadius = reelWidth * picPerReel * picHeight / ( picWidth * 2 * Math.PI )
    
    const renderer = new WebGLRenderer()

    const camera = new PerspectiveCamera( vertFieldOfViewDeg, aspectRatio)
    camera.position.set( 0, 0, distanceToCamera )
    camera.lookAt( 0, 0, 0 )

    const textureLoader = new TextureLoader()

    const scene = new Scene()
    scene.background = new Color(sceneBgColor)

    const light = new DirectionalLight( 0xFFFFFF )
    light.position.set( 0, 0, distanceToCamera )
    light.lookAt( 0, 0, 0 )
    scene.add(light)    
    
    function addCylinder(geometry, materials){
        const cylinder = new Mesh( geometry, materials )
        scene.add( cylinder )
        cylinder.rotation.z = Math.PI / 2
        return cylinder
    }

    const Material = MeshLambertMaterial
    
    const reelPicsMaterial = new Material( {
        map: textureLoader.load(reelImage),
    } );
    const heightSegments = 1
    const openEnded = true
    const reelGeometry = new CylinderGeometry( reelRadius, reelRadius, reelWidth, reelEdgeCount, heightSegments, openEnded )
    
    const reelMeshList = reelRange(n=>{
        const cylinder = addCylinder( reelGeometry, reelPicsMaterial )
        cylinder.position.x = n - allReelsWidth/2 + reelWidth/2
        return cylinder
    })

    const tickToRad = g => -g*Math.PI/picPerReel
    function moveToLine(mesh,g){
        mesh.position.y = Math.sin(tickToRad(g)) * reelRadius
        mesh.position.z = Math.cos(tickToRad(g)) * reelRadius
    }
    const tickGeometry = new SphereGeometry(tickSize)
    const tickMaterial = new Material( { color: new Color(tickColor) } )
    function addTick(x,g){
        const tick = new Mesh( tickGeometry, tickMaterial )
        tick.position.x = x
        moveToLine(tick,g)
        scene.add( tick )
    }
    reelRange(n=>{
        if(n>0){
            const x = n - allReelsWidth/2
            addTick(x,-1)
            addTick(x, 0)
            addTick(x, 1)
        }
    })
    
    const winLineGeometry = new CylinderGeometry( winLineThickness, winLineThickness, allReelsWidth, 8 )
    const winLineMaterial = new Material( { color: new Color(winLineColor) } )
    const winLineCylinder = addCylinder( winLineGeometry, winLineMaterial )
    
    
    function render(positions,winLinePos){
        reelRange(n=>{
            reelMeshList[n].rotation.x = tickToRad(positions[n])
        })
        moveToLine(winLineCylinder,winLinePos)
        renderer.render( scene, camera )
    }

    function resize(width){
        const height = width / aspectRatio
        renderer.setSize(width,height)
    }
    
    return { render, resize, domElement: renderer.domElement }
}

/********************************* logic ***********************************/

function getWill({pic,line}){
    return pic * 2 + line
}

function indexPayTableRules({rules,lineHints,pictureHints}){
    function indexOf(list,item){
        const res = list.indexOf(item)
        console.assert(res >= 0,"not found item: "+item)
        return res
    }
    const getKey = l => l.join('|')
    const mutableSearchIndex = {}
    const search = l => mutableSearchIndex[getKey(l)]
    rules.forEach(rule=>rule.lines.forEach(lineHint=>{
        const line = indexOf(lineHints,lineHint)
        const pics = rule.pictureHints.map(pictureHint=>indexOf(pictureHints,pictureHint))
        function forPics(wasRes){
            pics.forEach(pic=>{
                const res = [...wasRes, getWill({pic,line})]
                if(res.length < 3) return forPics(res)
                const found = search(res)
                if(!found || found.rule.payout < rule.payout) 
                    mutableSearchIndex[getKey(res)] = {rule,line}  
            })
        }
        forPics([])
    }))
    return search
}    

const SPIN_TAKE = "SPIN_TAKE"
const ROLLING_FINISHED = "ROLLING_FINISHED"
const STATE_READY = "STATE_READY"
const STATE_ROLLING = "STATE_ROLLING"
const STATE_PAYOUT = "STATE_PAYOUT"

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function createRolling({startPos,targetPos,startTime,targetTime,unsmooth}){
    const getFinished = t => targetTime < t
    const getProgress = t => getFinished(t) ? 0 : (targetTime-t)/(targetTime-startTime)
    const getPos = t => targetPos - (targetPos-startPos) * Math.pow(getProgress(t), unsmooth)
    return {getPos,getFinished,targetPos}
}

function spin(st){
    const startTime = Date.now() 
    return reelRange(n=>{
        const rotationCount = 4 + n
        const rotationPeriod = 2000 + n * 500 
        //        
        const targetTime = startTime + rotationPeriod
        const startPos = st.reelsModel[n].getPos(startTime) + picPerReel * 2 * rotationCount
        const targetPos = st.fixedMode ? getWill(st.reelsDebug[n]) : getRandomInt(picPerReel * 2)
        const unsmooth = 2
        return createRolling({startPos,targetPos,startTime,targetTime,unsmooth})
    })
}

function isRollingFinished(st){
    return st.stateType === STATE_ROLLING && st.reelsModel.every(r=>r.getFinished(Date.now()))
}

function reduce(st,action){
    if(st.stateType === STATE_READY && action === SPIN_TAKE && st.balance - spinCost >= 0){
        const reelsModel = spin(st)
        const balance = st.balance - spinCost
        const stateType = STATE_ROLLING
        return { ...st, reelsModel, balance, stateType }
    }
    if(st.stateType === STATE_ROLLING && action === ROLLING_FINISHED){
        const finalPositions = st.reelsModel.map(m=>m.targetPos)
        const activeRule = st.searchPayTableRule(finalPositions)
        const stateType = activeRule ? STATE_PAYOUT: STATE_READY 
        return { ...st, activeRule, stateType }
    }
    if(st.stateType === STATE_PAYOUT && action === SPIN_TAKE){
        const balance = st.balance + st.activeRule.rule.payout    
        const activeRule = null
        const stateType = STATE_READY
        return { ...st, balance, activeRule, stateType }
    }
    return st
}

function initState(){
    const {rules,pictureHints,lineHints} = definePayTableRules()
    return {
        pictureHints, lineHints,
        payTableRules: rules,
        searchPayTableRule: indexPayTableRules({rules,lineHints,pictureHints}),
        stateType: STATE_READY,
        reelsDebug: reelRange(n=>({ line: 0, pic: 0 })),
        reelsModel: reelRange(n=>({
            getPos: t => 0,
            getFinished: t => true,
            targetPos: 0,
        })),
        balance: 30,
    }
}

/********************************* react views ***********************************/

function useAnimationFrame(callback){
    useEffect(() => {
        const animate = () => {
            callback()
            req = requestAnimationFrame(animate)
        }
        let req = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(req)
    }, [callback])
}

function useWinResize(callback){
    useEffect(() => {
        callback()
        window.addEventListener('resize', callback, false)
        return () => window.removeEventListener('resize', callback, false)
    }, [callback]) 
}

function Button({activate,isActivated,title}){
    return createElement("button",{
        key: "activate",
        className: isActivated ? "Button Chosen" : "Button",
        onClick: ev => activate(),
    },title)
}

function PayTable({rules,activeRule}){
    return createElement("table",{key:"PayTable",className:"PayTable"},[
        createElement("thead",{key:"head"},[createElement("tr",{key:"head"},[
            createElement("th",{key:"c"},"Combination"),
            createElement("th",{key:"l"},"Lines"),
            createElement("th",{key:"p"},"Payout"),
        ])]),
        createElement("tbody",{key:"body"}, rules.map((rule,ruleIndex) => createElement("tr",{key:ruleIndex},[
            createElement("td",{key:"c"},rule.text),
            createElement("td",{key:"l"},rule.lines.join(" ")),
            createElement("td",{key:"p", className: activeRule && rule===activeRule.rule ?"Payout Chosen":"Payout" }, rule.payout),                                                    
        ]))),
    ])
}

function DebugReelControl({reelIndex,state,setState,pictureHints,lineHints}){
    function lineControl(lineHint) {
        const line = lineHints.indexOf(lineHint)
        return createElement("div",{
            key: line,
            className: state.line === line ? "Chosen" : "NotChosen",
            onClick: ev => setState(st=>({...st,line}))         
        },lineHint)
    }
    return createElement("div",{
        key:reelIndex,
        className: "ReelControl",
    },[
        //getWill(state),
        createElement("div",{
            key:"pictures", 
        }, pictureHints.map((pictureHint,pictureIndex) => createElement("div",{
            key: pictureIndex,
            style: { backgroundImage: "url("+reelImages[pictureIndex]+")" },
            className: ["ReelPic", state.pic === pictureIndex?"Chosen":"NotChosen"].join(" "),
            onClick: ev => setState(st=>({...st,pic:pictureIndex}))
        }))),
        createElement("div",{
            key:"lines", 
        },[
            lineControl("top"), 
            lineControl("center"), 
            lineControl("bottom"),           
        ]),
    ])
}

function App({reelView}){
    const [state,setState] = useState(initState)
    const resize = useCallback(()=>{
        reelView.resize(window.innerWidth/2)
    },[reelView])
    useWinResize(resize)
    const animate = useCallback(()=>{
        const t = Date.now()
        const hide = 5
        const winLine = state.activeRule ? 1-state.activeRule.line : hide
        reelView.render(state.reelsModel.map(r=>r.getPos(t)),winLine)
    },[reelView,state.reelsModel,state.activeRule])
    useAnimationFrame(animate)
    useAnimationFrame(()=>{
        if(isRollingFinished(state)) setState(st=>reduce(st,ROLLING_FINISHED))
    })
    const reelsRef = el => {
        const reelElement = reelView.domElement
        if(el) el.appendChild(reelElement) 
        else reelElement.parentElement.removeChild(reelElement)
    }
    return [
        createElement("div",{key:"Panel",className:"Panel"},[
            createElement(PayTable,{key:"PayTable",rules:state.payTableRules,activeRule:state.activeRule}),
            createElement(Button,{
                key: "spin",
                title: state.stateType===STATE_PAYOUT ? "TAKE":"SPIN",
                activate: () => setState(st=>reduce(st,SPIN_TAKE)),
            }),          
            createElement(Button,{
                key: "debug-mode",
                title: "FIXED MODE",
                activate: () => setState(st=>({...st,fixedMode:!st.fixedMode})),
                isActivated: state.fixedMode,
            }),
            createElement("div",{ key: "Balance", className: "Balance" },
                createElement("input",{
                    key: "input",
                    value: state.balance,
                    onChange: ev => {
                        const balance =  parseInt(ev.target.value)
                        if(balance>=minDebugBalance && balance<=maxDebugBalance) setState(st=>({...st, balance}))
                    },
                    //disabled: state.debugMode ? null : true,
                }),
            ),
        ]),
        createElement("div",{ key: "Reels", className: "Panel", ref: reelsRef }),
        state.fixedMode ? createElement("div",{key:"DebugArea",className:"Panel"},
            reelRange(reelIndex=>createElement(DebugReelControl,{
                key:reelIndex,
                reelIndex, 
                pictureHints: state.pictureHints, 
                lineHints: state.lineHints,
                state: state.reelsDebug[reelIndex],
                setState: f => setState(st=>({...st, reelsDebug: st.reelsDebug.map((v,i)=>i===reelIndex?f(v):v) }))
            }))
        ) : null,
    ]
}

const reelView = createReelView()
const debugAreaDomElement = document.createElement('div')
document.body.appendChild(debugAreaDomElement)
render(createElement(App,{reelView}), debugAreaDomElement)

