var b={VERSION:"1.0.0",MAX_CONCURRENT_VALIDATIONS:5,STORAGE_KEYS:{SETTINGS:"settings",ASSESSMENTS:"assessments",SELECTED_ASSESSMENTS:"selectedAssessments",CONTEXTS:"contexts",VALIDATIONS:"validations",REVIEWS:"reviews",LAST_RUN:"lastRun",LAST_ACTION:"lastAction",DEBUG:"debug",WHATS_NEW_MODAL:"whatsNewModalState"}},W={PRIMARY_ASSESSMENTS:"https://cairois.web.boeing.com/api/asset/4/82/assessment/type/35",ASSESSMENT_DETAIL:"https://cairois.web.boeing.com/api/assessment/{id}/detail",ASSESSMENT_ANSWERS:"https://cairois.web.boeing.com/api/assessment/survey/{id}/answers",ASSESSMENT_CONTACTS:"https://cairois.web.boeing.com/api/assessment/{id}/contacts",SURVEY_TEMPLATE_QUESTIONS:"https://cairois.web.boeing.com/api/survey/template/{id}/questions",SURVEY_TEMPLATE_DETAIL:"https://cairois.web.boeing.com/api/surveyTemplate/{id}",SURVEY_TEMPLATES_RP_APP:"https://cairois.web.boeing.com/api/surveyTemplate?where=alternateSurveyTemplateId:=:rp-app",REVIEW_SUMMARY:"https://cairois.web.boeing.com/api/asset/4/{assetId}/assessment/review/summaries?assessmentTypeId=35&reviewTypeId=6",ESATS_VERSIONS:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationVersion/GetBusinessApplicationVersions?esatsId={assetId}",ESATS_ARTIFACTS:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationVersionDocument/GetBusinessApplicationVersionPolicyAndArtifacts?esatsId={versionEsatsId}",GTC_LOOKUP:"https://termbank.web.boeing.com/ses/v1.2/GlobalTradeControlVocabularies/name/{name}.json"},ye=[{id:"cairo",name:"Cairo",url:W.PRIMARY_ASSESSMENTS,openUrl:"https://cairois.web.boeing.com/",expectedHosts:["cairois.web.boeing.com"]},{id:"esats",name:"ESATS",url:"https://service-gateway.tas-phx.apps.boeing.com/",openUrl:"https://esats.web.boeing.com/",expectedHosts:["service-gateway.tas-phx.apps.boeing.com","esats.web.boeing.com"]},{id:"gtc",name:"GTC",url:"https://termbank.web.boeing.com/",openUrl:"https://gtc-ecm.web.boeing.com/",expectedHosts:["termbank.web.boeing.com","gtc-ecm.web.boeing.com"]}];async function ie(e){return(await chrome.storage.local.get(e))[e]}async function Se(){return await ie(b.STORAGE_KEYS.ASSESSMENTS)||[]}async function be(){return await ie(b.STORAGE_KEYS.VALIDATIONS)||[]}async function Ee(){return await ie(b.STORAGE_KEYS.REVIEWS)||[]}async function te(){return(await chrome.storage.local.get("failedAssessments")).failedAssessments||[]}async function Ae(){return(await chrome.storage.local.get("assessmentContexts")).assessmentContexts||{}}function Ne(e,t){let n=[...e];if(t.search&&t.search.trim())if(t.regexMode)try{let r=new RegExp(t.search,"i");n=n.filter(a=>r.test(a.assetName||""))}catch{return[]}else{let r=t.search.toLowerCase();n=n.filter(a=>(a.assetName||"").toLowerCase().includes(r))}return t.fromDate&&(n=n.filter(r=>{let a=Te(r,t.dateFilterField);return!!a&&a>=t.fromDate})),t.toDate&&(n=n.filter(r=>{let a=Te(r,t.dateFilterField);return!!a&&a<=t.toDate})),t.assessmentStatus&&(n=n.filter(r=>{let a=ne(r);return!(t.assessmentStatus==="incomplete"&&!a||t.assessmentStatus==="completed"&&a)})),n}function ne(e){return!!(e.incompleteAssessmentId||e.hasIncomplete)}function je(e,t){return t==="dueOn"?e.dueOn||e.raw?.dueOn:e.surveyCompletedOn||e.raw?.surveyCompletedOn}function Te(e,t){let n=je(e,t);if(!n)return"";let a=String(n).match(/^\d{4}-\d{2}-\d{2}/);if(a)return a[0];let l=new Date(n);return Number.isNaN(l.getTime())?"":[l.getFullYear(),String(l.getMonth()+1).padStart(2,"0"),String(l.getDate()).padStart(2,"0")].join("-")}function xe(e){return e.map(t=>t.assessmentId)}var Ye=chrome.runtime.getURL("assets/encoded_data.txt");async function Ce(e){let t=Array.isArray(e)?e:[],n=await We(),r=n.worksheets[0],a=n.addWorksheet("All Assessments"),l=new Map;for(let o=0;o<t.length;o++){let d=t[o],c=Ie(d),T=et(c,o);l.set(c.assessmentId,T);let f=Xe(n,r,T);Je(f,d,c)}Ke(a,t,l),n.removeWorksheet(r.id),n.calcProperties.fullCalcOnLoad=!0,n.calcProperties.calcMode="auto";let i=await n.xlsx.writeBuffer();nt(i,`Risk_Profiler_Quality_List_${tt()}.xlsx`)}async function We(){let t=(await(await fetch(Ye)).text()).trim(),n=Uint8Array.from(atob(t),a=>a.charCodeAt(0)),r=new ExcelJS.Workbook;return await r.xlsx.load(n.buffer),r}function Ke(e,t,n){e.columns=[{header:"Open",key:"open",width:15},{header:"Assessment ID",key:"assessmentId",width:18},{header:"Application",key:"application",width:40},{header:"Asset ID",key:"assetId",width:15},{header:"Lifecycle",key:"lifecycle",width:20},{header:"Application Manager",key:"manager",width:30},{header:"Business System Owner",key:"owner",width:30},{header:"Survey Completed Date",key:"surveyCompletedDate",width:22},{header:"Attested Date",key:"attestedDate",width:22},{header:"Status",key:"status",width:15},{header:"Attested By",key:"attestedBy",width:30},{header:"Passed",key:"passed",width:12},{header:"Failed",key:"failed",width:12},{header:"N/A",key:"na",width:12},{header:"Score",key:"score",width:12},{header:"Error",key:"error",width:60}],t.forEach(r=>{let a=Ie(r),l=r.summary||{},i=(r.results||[]).filter(h=>h.status==="FAIL").map(h=>`${h.id}: ${h.reason}`),o=(r.results||[]).filter(h=>h.reason==="Question identifier was not found in the survey questions.").map(h=>h.id),d=[r.error,o.length?`Missing Questions: ${o.join(", ")}`:"",i.length?i.join(" | "):""].filter(Boolean).join(" | "),c=e.addRow({open:"Open",assessmentId:a.assessmentId,application:a.assetName,assetId:a.assetId,lifecycle:a.lifeCycle,manager:a.appMgrName,owner:a.sysOwnerName,surveyCompletedDate:le(a.surveyCompletedOn),attestedDate:le(a.attestOn),status:a.hasIncomplete?"Incomplete":"Completed",attestedBy:a.attestName||"",passed:l.passed||0,failed:l.failed||0,na:l.na||0,score:l.score?`${l.score}%`:"",error:d}),T=n.get(a.assessmentId),f=c.getCell(1);f.value={text:"Open",hyperlink:`#'${T}'!A1`},f.font={color:{argb:"FF0563C1"},underline:!0}}),e.getRow(1).font={bold:!0}}function Je(e,t,n){e.getCell("C2").value=n.assetName||"",e.getCell("C3").value=n.assetId||"",e.getCell("C4").value=n.appMgrName||"",e.getCell("C5").value=le(new Date);let r=ze(e);(t.results||[]).forEach(a=>{let l=r[String(a.id).toUpperCase()];if(!l)return;let i=e.getCell(`A${l}`);i.value=Ze(a.status);let o=String(a.status||"").toUpperCase();o==="PASS"?(i.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF00A300"}},i.font={color:{argb:"ff000000"},bold:!0}):o==="FAIL"?(i.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFF0000"}},i.font={color:{argb:"ff000000"},bold:!0}):o==="NA"&&(i.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFD9D9D9"}},i.font={color:{argb:"ff000000"},italic:!0}),e.getCell(`D${l}`).value=a.reason||""})}function ze(e){let t={};return e.eachRow((n,r)=>{let a=String(n.getCell(2).value||"").trim().toUpperCase();/^RP\d+$/.test(a)&&(t[a]=r)}),t}function Xe(e,t,n){let r=e.addWorksheet(n);return t.properties&&(r.properties=JSON.parse(JSON.stringify(t.properties))),t.pageSetup&&(r.pageSetup=JSON.parse(JSON.stringify(t.pageSetup))),t.views&&(r.views=JSON.parse(JSON.stringify(t.views))),t.columns.forEach((a,l)=>{let i=r.getColumn(l+1);i.width=a.width,i.hidden=a.hidden,i.outlineLevel=a.outlineLevel}),t.eachRow({includeEmpty:!0},(a,l)=>{let i=r.getRow(l);i.height=a.height,i.hidden=a.hidden,i.outlineLevel=a.outlineLevel,a.eachCell({includeEmpty:!0},(o,d)=>{let c=i.getCell(d);if(typeof o.value=="object"&&o.value!==null)try{c.value=JSON.parse(JSON.stringify(o.value))}catch{c.value=o.text||""}else c.value=o.value;try{c.style=JSON.parse(JSON.stringify(o.style||{}))}catch{c.style={}}if(o.alignment)try{c.alignment=JSON.parse(JSON.stringify(o.alignment))}catch{}if(o.font)try{c.font=JSON.parse(JSON.stringify(o.font))}catch{}if(o.border)try{c.border=JSON.parse(JSON.stringify(o.border))}catch{}if(o.fill)try{c.fill=JSON.parse(JSON.stringify(o.fill))}catch{}if(o.numFmt&&(c.numFmt=o.numFmt),o.protection)try{c.protection=JSON.parse(JSON.stringify(o.protection))}catch{}})}),t.model?.merges&&t.model.merges.forEach(a=>{try{r.mergeCells(a)}catch{}}),r}function Ze(e){switch(String(e||"").toUpperCase()){case"PASS":return"Yes";case"FAIL":return"No";case"NA":return"N/A";default:return""}}function Ie(e){return{...e.assessment||{},assessmentId:e.assessmentId,assetName:e.assetName,...e.assessment||{}}}function et(e,t){return(e.assetName||`Assessment ${t+1}`).replace(/[\\/?*[\]:]/g," ").trim().slice(0,31)}function le(e){if(!e)return"";try{return new Date(e).toLocaleDateString()}catch{return e}}function tt(){let e=new Date,t=n=>String(n).padStart(2,"0");return`${e.getFullYear()}${t(e.getMonth()+1)}${t(e.getDate())}_${t(e.getHours())}${t(e.getMinutes())}${t(e.getSeconds())}`}function nt(e,t){let n=new Blob([e],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),r=URL.createObjectURL(n),a=document.createElement("a");a.href=r,a.download=t,a.click(),setTimeout(()=>URL.revokeObjectURL(r),1e3)}var de="http://schemas.openxmlformats.org/wordprocessingml/2006/main",st="http://schemas.microsoft.com/office/word/2010/wordml",rt="http://schemas.openxmlformats.org/markup-compatibility/2006",at=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`,ot=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,it=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,lt=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${de}">
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
        <w:name w:val="Normal"/>
        <w:qFormat/>
        <w:rPr>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
            <w:sz w:val="22"/>
            <w:szCs w:val="22"/>
        </w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Title">
        <w:name w:val="Title"/>
        <w:basedOn w:val="Normal"/>
        <w:qFormat/>
        <w:rPr>
            <w:b/>
            <w:color w:val="1F2937"/>
            <w:sz w:val="32"/>
        </w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Heading1">
        <w:name w:val="heading 1"/>
        <w:basedOn w:val="Normal"/>
        <w:qFormat/>
        <w:rPr>
            <w:b/>
            <w:color w:val="315FD6"/>
            <w:sz w:val="26"/>
        </w:rPr>
    </w:style>
</w:styles>`,ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${de}">
    <w:updateFields w:val="true"/>
</w:settings>`,Le=new TextEncoder,dt=bt();async function $e(e){let t=new Blob([ut(e)],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),n=URL.createObjectURL(t),r=document.createElement("a");r.href=n,r.download=`${Nt(e?.assetName||"application")}_RISK-PRofiler_review_notes.docx`,r.click(),URL.revokeObjectURL(n)}function ut(e){return St([{name:"[Content_Types].xml",content:at},{name:"_rels/.rels",content:ot},{name:"word/document.xml",content:mt(e)},{name:"word/_rels/document.xml.rels",content:it},{name:"word/styles.xml",content:lt},{name:"word/settings.xml",content:ct}])}function mt(e){let t=e?.contacts||[],n=[E([v(`${e?.assetName||"Application"} Risk Profiler Review Notes`,{bold:!0})],{style:"Title",spacingAfter:260}),E([v("Application Details",{bold:!0})],{style:"Heading1"}),ft([["Application Name",e?.assetName||"N/A"],["Due Date",Re(e?.dueOn)||"N/A"],["Survey Completed On",Re(e?.surveyCompletedOn)||"N/A"],["Review Assessment Date",Tt(e?.reviewedAt)||"N/A"]]),E([v("Contacts",{bold:!0})],{style:"Heading1",spacingBefore:180}),pt(t),E([v("Review Output",{bold:!0})],{style:"Heading1",spacingBefore:220}),wt(e?.workQueue||[])].join("");return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
    xmlns:w="${de}"
    xmlns:w14="${st}"
    xmlns:mc="${rt}"
    mc:Ignorable="w14">
    <w:body>
        ${n}
        <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
        </w:sectPr>
    </w:body>
</w:document>`}function pt(e){if(e.length===0)return E([v("No Responsible Manager or Primary Contact details were found.")]);let t=[se([I("Contact Type",{bold:!0,fill:"E8EEFC"}),I("Name",{bold:!0,fill:"E8EEFC"}),I("Identity ID",{bold:!0,fill:"E8EEFC"}),I("Email",{bold:!0,fill:"E8EEFC"})]),...e.map(n=>se([I(n.contactType||"N/A"),I(n.associatedTo||"N/A"),I(n.associatedToIdentityId||"N/A"),I(n.email||"N/A")]))];return ue(t)}function ft(e){return ue(e.map(([t,n])=>se([I(t,{bold:!0,fill:"F3F4F6"}),I(n)])))}function wt(e){return e.length===0?E([v("No reachable unanswered work queue items were found.")]):e.map((t,n)=>[E([v(t.status||"Review Item",{bold:!0,color:"315FD6"})],{spacingBefore:n===0?80:180,spacingAfter:80,borderBottom:(n>0,!1)}),vt(t.questionGroup||"N/A",t.questionId||"N/A"),Oe("Question",t.question||"N/A"),Oe("Answer Type",t.answerType||"N/A"),E([v("Options",{bold:!0})]),...ht(t.options||[]),yt()].join("")).join("")}function ht(e){return(e.length?e:[{index:1,internalValue:"<no options>"}]).map(n=>E([gt(),v(` ${n.index||""}. ${n.internalValue||n.displayValue||"<no options>"}`)],{indentLeft:360,spacingAfter:70}))}function vt(e,t){return ue([se([ce([v("Category: ",{bold:!0}),v(e)]),ce([v("Question ID: ",{bold:!0}),v(t)],{align:"right"})])],{noBorders:!0})}function Oe(e,t){return E([v(`${e}: `,{bold:!0}),v(t)])}function gt(){return`
        <w:sdt>
            <w:sdtPr>
                <w:id w:val="${Math.floor(Math.random()*1e9)}"/>
                <w14:checkbox>
                    <w14:checked w14:val="0"/>
                    <w14:checkedState w14:val="2612" w14:font="Segoe UI Symbol"/>
                    <w14:uncheckedState w14:val="2610" w14:font="Segoe UI Symbol"/>
                </w14:checkbox>
            </w:sdtPr>
            <w:sdtContent>
                <w:r>
                    <w:rPr>
                        <w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol"/>
                        <w:sz w:val="22"/>
                    </w:rPr>
                    <w:t>\u2610</w:t>
                </w:r>
            </w:sdtContent>
        </w:sdt>`}function yt(){return E([],{borderBottom:!0,spacingBefore:80,spacingAfter:140})}function E(e,t={}){let n=[];return t.style&&n.push(`<w:pStyle w:val="${Fe(t.style)}"/>`),t.align&&n.push(`<w:jc w:val="${t.align}"/>`),(t.spacingBefore||t.spacingAfter)&&n.push(`<w:spacing w:before="${t.spacingBefore||0}" w:after="${t.spacingAfter||0}"/>`),t.indentLeft&&n.push(`<w:ind w:left="${t.indentLeft}"/>`),t.borderBottom&&n.push('<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/></w:pBdr>'),`<w:p>${n.length?`<w:pPr>${n.join("")}</w:pPr>`:""}${e.join("")}</w:p>`}function v(e,t={}){let n=[];return t.bold&&n.push("<w:b/>"),t.color&&n.push(`<w:color w:val="${t.color}"/>`),`<w:r>${n.length?`<w:rPr>${n.join("")}</w:rPr>`:""}<w:t xml:space="preserve">${Fe(e)}</w:t></w:r>`}function ue(e,t={}){return`<w:tbl>
        <w:tblPr>
            <w:tblW w:w="5000" w:type="pct"/>
            ${t.noBorders?`<w:tblBorders>
                <w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>
            </w:tblBorders>`:`<w:tblBorders>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:left w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:right w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:insideH w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:insideV w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
            </w:tblBorders>`}
        </w:tblPr>
        ${e.join("")}
    </w:tbl>`}function se(e){return`<w:tr>${e.join("")}</w:tr>`}function I(e,t={}){return ce([v(e||"",{bold:t.bold})],t)}function ce(e,t={}){let n=['<w:tcW w:w="2500" w:type="pct"/>','<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>'];return t.fill&&n.push(`<w:shd w:fill="${t.fill}"/>`),`<w:tc><w:tcPr>${n.join("")}</w:tcPr>${E(e,{align:t.align})}</w:tc>`}function St(e){let t=0,n=[],r=[];e.forEach(i=>{let o=Le.encode(i.name),d=Le.encode(i.content),c=Et(d);n.push(y(67324752),m(20),m(0),m(0),m(0),m(0),y(c),y(d.length),y(d.length),m(o.length),m(0),o,d),r.push(y(33639248),m(20),m(20),m(0),m(0),m(0),m(0),y(c),y(d.length),y(d.length),m(o.length),m(0),m(0),m(0),m(0),y(0),y(t),o),t+=30+o.length+d.length});let a=De(r),l=[y(101010256),m(0),m(0),m(e.length),m(e.length),y(a),y(t),m(0)];return At([...n,...r,...l])}function bt(){let e=[];for(let t=0;t<256;t+=1){let n=t;for(let r=0;r<8;r+=1)n=n&1?3988292384^n>>>1:n>>>1;e[t]=n>>>0}return e}function Et(e){let t=4294967295;for(let n of e)t=dt[(t^n)&255]^t>>>8;return(t^4294967295)>>>0}function m(e){let t=new Uint8Array(2);return new DataView(t.buffer).setUint16(0,e,!0),t}function y(e){let t=new Uint8Array(4);return new DataView(t.buffer).setUint32(0,e>>>0,!0),t}function At(e){let t=De(e),n=new Uint8Array(t),r=0;return e.forEach(a=>{n.set(a,r),r+=a.length}),n}function De(e){return e.reduce((t,n)=>t+n.length,0)}function Fe(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function Re(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"2-digit"})}function Tt(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleString(void 0,{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}function Nt(e){return String(e).trim().replace(/[\\/:*?"<>|]+/g,"_").replace(/\s+/g,"_").replace(/^_+|_+$/g,"")||"application"}function me(e,t){let n=e;return Object.entries(t).forEach(([r,a])=>{n=n.replace(`{${r}}`,a)}),n}var K=new Map,xt="https://esats.web.boeing.com",Ct="service-gateway.tas-phx.apps.boeing.com",It="https://gtc-ecm.web.boeing.com",Lt="termbank.web.boeing.com",Ot={retries:3,retryDelay:1e3,useCache:!0};function Rt(e){return new Promise(t=>setTimeout(t,e))}function $t(e){try{return new URL(e).hostname===Ct}catch{return!1}}function Dt(e){try{return new URL(e).hostname===Lt}catch{return!1}}function Ft(){return typeof chrome<"u"&&chrome.tabs&&chrome.scripting}function kt(e){return new Promise(t=>{chrome.tabs.query(e,t)})}async function Mt(e){let t=await kt({url:`${e}/*`});return t.find(n=>n.id&&n.status==="complete")||t.find(n=>n.id)}function _t(e){return new Promise((t,n)=>{chrome.scripting.executeScript(e,r=>{let a=chrome.runtime.lastError;if(a){n(new Error(a.message));return}t(r)})})}async function ke(e,{pageOrigin:t,label:n,useBearerToken:r}){if(!Ft())throw new Error(`${n} requests require the Chrome scripting permission.`);let a=await Mt(t);if(!a)throw new Error(`Open ${n} in this browser and sign in before running ${n} validation requests.`);let i=(await _t({target:{tabId:a.id},world:"MAIN",args:[e,r,t],func:async(o,d,c)=>{function T(C){if(!C)return null;let g=String(C).trim();g.startsWith("Bearer ")&&(g=g.slice(7).trim());try{let u=JSON.parse(g);typeof u=="string"?g=u.trim():u&&typeof u=="object"&&(g=u.esatsToken||u.access_token||u.token||u.value||g)}catch{}return g||null}let f=d?T(localStorage.getItem("esatsToken")):null,h={Accept:"application/json, text/plain, */*"};d&&f&&(h.Authorization=`Bearer ${f}`);try{let u=null,q=null;for(let H=1;H<=3;H++){try{if(u=await fetch(o,{method:"GET",headers:h,credentials:"omit",cache:"no-store",referrer:`${c}/`,referrerPolicy:"strict-origin-when-cross-origin"}),u.ok)break;q=new Error(`${u.status} ${u.statusText}`)}catch(N){q=N}H<3&&await new Promise(N=>setTimeout(N,1e3))}if(!u||!u.ok)throw q||new Error("Request failed");let V=await u.text(),Q=null;if(V)try{Q=JSON.parse(V)}catch{Q=V}return{ok:u.ok,status:u.status,statusText:u.statusText,url:u.url,hasAuthorization:d?!!f:!0,data:Q}}catch(C){return console.log("ESATS token:",f),console.log("Request URL:",o),console.log("Headers:",h),{ok:!1,status:0,statusText:C.message||"Request failed",hasAuthorization:d?!!f:!0,error:C.message}}}}))?.[0]?.result;if(!i)throw new Error(`${n} request did not return a response.`);if(!i.ok){let o=i.hasAuthorization?"":" No ESATS bearer token was found in the ESATS tab.";throw new Error(`${n} request failed: ${i.status} ${i.statusText}.${o}`)}return i.data}async function Bt(e){return ke(e,{pageOrigin:xt,label:"ESATS",useBearerToken:!0})}async function Pt(e){return ke(e,{pageOrigin:It,label:"GTC",useBearerToken:!1})}async function re(e,t={}){let n={...Ot,...t};if(n.useCache&&K.has(e))return K.get(e);let r;for(let a=1;a<=n.retries;a++)try{if($t(e)){let o=await Bt(e);return n.useCache&&K.set(e,o),o}if(Dt(e)){let o=await Pt(e);return n.useCache&&K.set(e,o),o}let l=await fetch(e,{credentials:"include",headers:{Accept:"application/json, text/plain, */*"},cache:"no-store"});if(!l.ok)throw new Error(`${l.status} ${l.statusText}`);let i=await l.json();return n.useCache&&K.set(e,i),i}catch(l){r=l,a<n.retries&&await Rt(n.retryDelay)}throw r}async function pe(e){if(!e)return[];let t=me(W.SURVEY_TEMPLATE_QUESTIONS,{id:e});return re(t)}async function fe(e){if(!e)return null;let t=me(W.SURVEY_TEMPLATE_DETAIL,{id:e});return re(t)}async function Me(){return re(W.SURVEY_TEMPLATES_RP_APP,{useCache:!1})}function _e(e){let t=new Map;for(let n of e)n.alternateQuestionId&&t.set(n.alternateQuestionId,n);return t}async function Be(e,t){if(!e||!t)throw new Error("Both survey template IDs are required.");if(Number(e)===Number(t))return{metadata:{fromId:Number(e),toId:Number(t)},newQuestions:[],removedQuestions:[],modifiedQuestions:[]};let[n,r,a,l]=await Promise.all([fe(e),pe(e),fe(t),pe(t)]);if(!n||!a)throw new Error("Unable to load one or both survey template details.");let i=_e(r||[]),o=_e(l||[]),d=new Set([...i.keys(),...o.keys()]),c=Array.from(d).sort(),T={metadata:{fromId:Number(e),fromVersionNumber:n.versionNumber,fromUpdatedOn:n.updatedOn,fromReleasedOn:n.releasedOn,toId:Number(t),toVersionNumber:a.versionNumber,toUpdatedOn:a.updatedOn,toReleasedOn:a.releasedOn},newQuestions:[],removedQuestions:[],modifiedQuestions:[]};for(let f of c)if(!i.has(f))T.newQuestions.push({alternateQuestionId:f,questionText:o.get(f).questionText});else if(!o.has(f))T.removedQuestions.push({alternateQuestionId:f,questionText:i.get(f).questionText});else{let h=i.get(f),C=o.get(f),g=!1,u={alternateQuestionId:f};h.questionText!==C.questionText&&(u.textChanged={old:h.questionText,new:C.questionText},g=!0);let q=new Set((h.options||[]).map(N=>N.displayValue)),V=new Set((C.options||[]).map(N=>N.displayValue)),Q=[...V].filter(N=>!q.has(N)),H=[...q].filter(N=>!V.has(N));(Q.length>0||H.length>0)&&(u.optionsChanged={added:Q,removed:H},g=!0),g&&T.modifiedQuestions.push(u)}return T}var _=[],M=[],L=[],S=[],A=[],j=!1,z=!1,R="validation",O=null,x=[],p=null,w=null,J=0,s=e=>document.getElementById(e);document.addEventListener("DOMContentLoaded",Ut);async function Ut(){await qe(),Vt(),await nn(),Qe(),zt(),rn(),un()}async function qe(){_=await Se(),M=[..._],qt(),ee()}function qt(){let e=s("ownerFilter");if(!e)return;[...new Set(_.map(n=>n.appMgrName))].filter(Boolean).sort().forEach(n=>{let r=document.createElement("option");r.value=n,r.textContent=n,e.appendChild(r)})}function Vt(){s("searchInput")?.addEventListener("input",k),s("regexMode")?.addEventListener("change",k),s("fromDate")?.addEventListener("change",k),s("toDate")?.addEventListener("change",k),s("dateFilterField")?.addEventListener("change",k),s("assessmentStatusFilter")?.addEventListener("change",k),s("ownerFilter")?.addEventListener("change",k),s("clearFiltersBtn")?.addEventListener("click",Qt),s("refreshBtn")?.addEventListener("click",Wt),s("checkPrereqBtn")?.addEventListener("click",Qe),s("selectAllBtn")?.addEventListener("click",jt),s("clearSelectionBtn")?.addEventListener("click",Yt),s("validateBtn")?.addEventListener("click",Kt),s("reviewBtn")?.addEventListener("click",Jt),s("cancelBtn")?.addEventListener("click",async()=>{await chrome.runtime.sendMessage({action:"STOP_VALIDATION"})}),s("retryFailedBtn")?.addEventListener("click",ln),s("clearResultsBtn")?.addEventListener("click",an),s("clearReviewResultsBtn")?.addEventListener("click",on),s("exportBtn")?.addEventListener("click",dn),s("validationTabBtn")?.addEventListener("click",()=>B("validation")),s("reviewTabBtn")?.addEventListener("click",()=>B("review")),s("closeReviewNotesModalBtn")?.addEventListener("click",Pe),s("reviewNotesModal")?.addEventListener("click",e=>{e.target===s("reviewNotesModal")&&Pe()}),s("copyReviewNotesBtn")?.addEventListener("click",en),tn()}function k(){let e={search:s("searchInput")?.value||"",regexMode:s("regexMode")?.checked||!1,fromDate:s("fromDate")?.value||"",toDate:s("toDate")?.value||"",dateFilterField:s("dateFilterField")?.value||"surveyCompletedOn",assessmentStatus:s("assessmentStatusFilter")?.value||""};M=Ne(_,e);let t=s("ownerFilter")?.value;t&&(M=M.filter(n=>n.appMgrName===t)),ee()}function Qt(){s("searchInput").value="",s("regexMode").checked=!1,s("fromDate").value="",s("toDate").value="",s("dateFilterField").value="surveyCompletedOn",s("assessmentStatusFilter").value="",s("ownerFilter").value="",M=[..._],ee()}function ee(){let e=s("assessmentList");e.innerHTML="",M.forEach(t=>{let n=Ht(t),r=document.createElement("div");r.className=`assessment-row ${n.className}`,r.innerHTML=`

                <input
                    type="checkbox"
                    class="assessment-checkbox"
                    data-id="${t.assessmentId}"
                    ${L.includes(t.assessmentId)?"checked":""}
                >

                <div class="assessment-meta">

                    <div class="asset-name">

                        ${t.assetName}

                        <span class="status-pill ${n.className}">
                            ${n.label}
                        </span>

                    </div>

                    <div class="asset-sub">

                        ID:
                        ${t.assessmentId}

                        \u2022

                        ${t.lifeCycle}

                        \u2022

                        ${t.appMgrName||"N/A"}

                    </div>

                    <div class="asset-sub date-info">

                        ${ne(t)?`<strong>Incomplete initiated date:</strong> ${F(t.incompleteInitiatedOn||t.raw?.incompleteInitiatedOn)||"N/A"}`:`<strong>Assessed date:</strong> ${F(t.attestOn||t.raw?.attestOn)||"N/A"} \u2022 <strong>Survey completed date:</strong> ${F(t.surveyCompletedOn||t.raw?.surveyCompletedOn)||"N/A"}`}

                    </div>

                    <div class="asset-sub status-detail">

                        ${n.detail}

                    </div>

                </div>

            `,e.appendChild(r)}),Gt(),Ve()}function Ht(e){if(ne(e)){let a=e.incompleteInitiatedByName||e.raw?.incompleteInitiatedByName||"N/A",l=e.incompleteInitiatedOn||e.raw?.incompleteInitiatedOn;return{label:"Incomplete",className:"status-incomplete",detail:`Incomplete mark \u2022 Initiated by ${a}${l?` \u2022 ${F(l)}`:""}`}}let n=e.attestName||e.raw?.attestName||"N/A",r=e.attestOn||e.raw?.attestOn;return{label:"Completed",className:"status-completed",detail:`Attested by ${n}${r?` \u2022 ${F(r)}`:""}`}}function F(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?e:t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"2-digit"})}function Gt(){document.querySelectorAll(".assessment-checkbox").forEach(e=>{e.addEventListener("change",t=>{let n=Number(t.target.dataset.id);t.target.checked?L.includes(n)||L.push(n):L=L.filter(r=>r!==n),Ve()})})}function Ve(){s("selectedCount").textContent=`${L.length} Selected`}function jt(){L=xe(M),ee()}function Yt(){L=[],ee()}async function Wt(){s("refreshBtn").disabled=!0;try{await chrome.runtime.sendMessage({action:"REFRESH_ASSESSMENTS"}),await qe()}finally{s("refreshBtn").disabled=!1}}async function Kt(){let e=_.filter(t=>L.includes(t.assessmentId));if(e.length===0){alert("Select at least one assessment.");return}j=!1,B("validation"),s("progressContainer")?.classList.remove("hidden"),s("cancelBtn")?.classList.remove("hidden"),s("retryFailedBtn")?.classList.add("hidden"),await chrome.runtime.sendMessage({action:"START_VALIDATION",assessments:e})}async function Jt(){let e=_.filter(t=>L.includes(t.assessmentId));if(e.length===0){alert("Select at least one assessment.");return}z=!1,B("review"),s("progressContainer")?.classList.remove("hidden"),G({completed:0,total:e.length,current:"Starting validation",startedAt:Date.now()}),s("retryFailedBtn")?.classList.add("hidden"),s("reviewBtn").disabled=!0,await chrome.runtime.sendMessage({action:"START_REVIEW",assessments:e})}function zt(){setInterval(async()=>{let e=await chrome.storage.local.get(["validationProgress","validationComplete","validationResults","validationError","reviewProgress","reviewComplete","reviewResults","reviewError",b.STORAGE_KEYS.LAST_ACTION]),t=e[b.STORAGE_KEYS.LAST_ACTION]||R;t==="validation"&&e.validationProgress&&!e.validationComplete&&G(e.validationProgress),e.validationComplete&&!j&&(S=e.validationResults||[],ve(S),j=!0,B("validation"),s("exportBtn")?.classList.remove("hidden"),s("clearResultsBtn")?.classList.remove("hidden"),s("cancelBtn")?.classList.add("hidden"),G(e.validationProgress),(await te()).length?s("retryFailedBtn")?.classList.remove("hidden"):s("retryFailedBtn")?.classList.add("hidden")),t==="review"&&e.reviewProgress&&!e.reviewComplete&&G(e.reviewProgress),e.reviewComplete&&!z&&(A=e.reviewResults||[],ae(A),z=!0,B("review"),s("reviewBtn").disabled=!1,G(e.reviewProgress),s("clearReviewResultsBtn")?.classList.remove("hidden")),t==="validation"&&e.validationError&&!e.validationProgress&&(s("cancelBtn")?.classList.add("hidden"),s("progressText").textContent=e.validationError),e.reviewError&&(s("reviewBtn").disabled=!1)},1e3)}function G(e){if(!e||!e.total)return;let t=Math.round(e.completed/e.total*100),n=e.completedAt||Date.now(),r=e.startedAt||n,a=Math.max(0,n-r),l=e.completed>=e.total,i=!l&&e.completed>0?` \u2022 Estimated remaining: ${we(Math.max(0,a/e.completed*(e.total-e.completed)))}`:l?"":" \u2022 Estimated remaining: calculating";s("progressText").textContent=l?`${e.completed} out of ${e.total} completed \u2022 Processing time: ${we(a)}`:`${e.completed} out of ${e.total} completed \u2022 Time elapsed: ${we(a)}${i}`,s("progressFill").style.width=`${t}%`}function we(e){let t=Math.max(0,Math.round(e/1e3));if(t<60)return`${t}s`;let n=Math.floor(t/60),r=t%60;return`${n}m ${r}s`}function B(e){R=e==="review"?"review":"validation",s("validationTabBtn")?.classList.toggle("active",R==="validation"),s("reviewTabBtn")?.classList.toggle("active",R==="review"),s("resultsContainer")?.classList.toggle("hidden",R!=="validation"),s("reviewResultsContainer")?.classList.toggle("hidden",R!=="review"),P()}function P(){let e=S&&S.length>0,t=A&&A.length>0;s("exportBtn")?.classList.toggle("hidden",R!=="validation"||!e),s("clearResultsBtn")?.classList.toggle("hidden",R!=="validation"||!e),s("clearReviewResultsBtn")?.classList.toggle("hidden",R!=="review"||!t)}function ve(e){let t=s("validationCardsContainer");if(t.innerHTML="",!e||e.length===0){P();return}e.forEach(n=>{let r=document.createElement("div");r.className="result-card";let a=n.results&&n.results.some(o=>o.reason==="Question identifier was not found in the survey questions."),l=n.summary?n.summary.score:null,i=l!==null&&l<90;r.innerHTML=`

                <div class="result-header">

                    <strong>

                        ${n.assetName}

                    </strong>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${a?'<span class="score-error-indicator" title="Question identifier was not found in the survey questions.">! Error</span>':""}
                        <span class="score-pill ${i?"score-low":""}">
                            ${n.summary?`${l}%`:"Error"}
                        </span>
                    </div>

                </div>

                <div class="result-meta">

                    ${n.error?n.error:`
                    PASS:
                    ${n.summary.passed}

                    |

                    FAIL:
                    ${n.summary.failed}

                    |

                    N/A:
                    ${n.summary.na}
                    `}

                </div>

                ${n.error?"":`
                <details>

                    <summary>
                        Checkpoints
                    </summary>

                    <div class="checkpoint-results">

                        <div class="checkpoint-results-header">
                            <span>Checkpoint Details</span>
                            <button
                                class="download-context download-context-btn"
                                data-id="${n.assessmentId}"
                                title="Download Context"
                                aria-label="Download Context"
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                            </button>
                        </div>

                        ${n.results.map(o=>`

                            <div${o.reason==="Question identifier was not found in the survey questions."?' class="rule-error-missing"':""}>

                                <strong>
                                    ${o.id}
                                </strong>

                                :

                                ${o.status}

                                <br>

                                <small>
                                    ${o.reason}
                                </small>

                            </div>

                            <hr>
                        `).join("")}

                    </div>

                </details>
                    `}
            `,t.appendChild(r)}),document.querySelectorAll(".download-context").forEach(n=>{n.addEventListener("click",()=>{cn(n.dataset.id)})}),P()}function ae(e){let t=s("reviewCardsContainer");if(t.innerHTML="",!e||e.length===0){t.innerHTML='<div class="review-empty">No review results yet.</div>',P();return}e.forEach(n=>{let r=document.createElement("div"),a=n.status==="Incomplete"?"status-incomplete":"status-completed";r.className=`review-card ${a}`;let l=n.status==="Incomplete"?`
                        <div><strong>Survey Completed On:</strong> ${n.surveyCompletedOnFormatted||"N/A"}</div>
                        <div><strong>Due On:</strong> ${n.dueOnFormatted||"N/A"}</div>
                        <div><strong>Incomplete Initiated On:</strong> ${n.incompleteInitiatedOnFormatted||"N/A"}</div>
                    `:`
                        <div><strong>Survey Completed On:</strong> ${n.surveyCompletedOnFormatted||"N/A"}</div>
                        <div><strong>Due On:</strong> ${n.dueOnFormatted||"N/A"}</div>
                    `;r.innerHTML=`
                <div class="review-card-header">
                    <div class="review-card-title">
                        ${n.assetName||"Unknown Assessment"}
                        <span>Assessment ID: ${n.assessmentId||"N/A"}</span>
                    </div>
                    <span class="status-pill ${a}">
                        ${n.status||"Completed"}
                    </span>
                </div>
                <div class="review-card-meta">
                    ${l}
                    <div><strong>Review Items:</strong> ${n.workQueue?n.workQueue.length:0}</div>
                </div>
                ${n.error?`<div class="review-error">${n.error}</div>`:`<div class="review-card-actions">
                        <button
                            class="btn-secondary review-notes-btn"
                            data-id="${n.assessmentId}"
                        >
                            Review Notes
                        </button>
                        <button
                            class="btn-secondary download-review-notes-btn"
                            data-id="${n.assessmentId}"
                        >
                            Download Review Notes
                        </button>
                    </div>`}
            `,t.appendChild(r)}),document.querySelectorAll(".review-notes-btn").forEach(n=>{n.addEventListener("click",()=>Zt(n.dataset.id))}),document.querySelectorAll(".download-review-notes-btn").forEach(n=>{n.addEventListener("click",()=>Xt(n.dataset.id))}),P()}async function Xt(e){let t=A.find(n=>String(n.assessmentId)===String(e));!t||t.error||await $e(t)}function Zt(e){let t=A.find(n=>String(n.assessmentId)===String(e));!t||t.error||(O=t,s("reviewNotesTitle").textContent=t.assetName||"Review Notes",s("reviewNotesMeta").innerHTML=t.notesMetaHtml||"",s("reviewNotesContent").innerHTML=t.reviewOutputHtml||t.notesHtml||"",s("reviewNotesModal")?.classList.remove("hidden"))}function Pe(){s("reviewNotesModal")?.classList.add("hidden"),O=null}async function en(){if(!O)return;let t=`<!doctype html><html><head><meta charset="utf-8"></head><body>${O.reviewOutputCopyHtml||O.reviewOutputHtml||O.notesHtml||""}</body></html>`,n=O.reviewOutputText||O.notesText||s("reviewNotesContent")?.innerText||"",r=O.reviewOutputRtf||"";try{if(navigator.clipboard?.write&&window.ClipboardItem){let a={"text/html":new Blob([t],{type:"text/html"}),"text/plain":new Blob([n],{type:"text/plain"})};r&&(a["text/rtf"]=new Blob([r],{type:"text/rtf"}));try{await navigator.clipboard.write([new ClipboardItem(a)])}catch{await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([t],{type:"text/html"}),"text/plain":new Blob([n],{type:"text/plain"})})])}}else await navigator.clipboard.writeText(n);s("copyReviewNotesBtn").textContent="Copied",setTimeout(()=>{s("copyReviewNotesBtn").textContent="Copy Review Output"},1200)}catch{await navigator.clipboard.writeText(n)}}function tn(){let e=new Map(ye.map(t=>[t.id,t.openUrl||t.url]));document.querySelectorAll(".prereq-open-link").forEach(t=>{let n=e.get(t.dataset.site);n&&(t.href=n,t.addEventListener("click",r=>{r.preventDefault(),r.stopPropagation(),chrome.tabs.create({url:n})}))})}async function nn(){let e=await chrome.storage.local.get("prerequisiteStatus");e.prerequisiteStatus&&He(e.prerequisiteStatus)}async function Qe(){sn();try{let e=await chrome.runtime.sendMessage({action:"CHECK_PREREQUISITES"});e?.success&&e.prerequisites&&He(e.prerequisites)}catch(e){s("prereqSummary").textContent=`Unable to check sessions: ${e.message}`,document.querySelectorAll(".prereq-item .signal").forEach(t=>{t.className="signal signal-fail"})}}function sn(){s("prereqSummary").textContent="Checking Cairo, ESATS, and GTC sessions...",document.querySelectorAll(".prereq-item").forEach(e=>{let t=e.querySelector(".signal"),n=e.querySelector("small");t.className="signal signal-checking",n&&(n.textContent="Checking..."),e.title="Checking session..."})}function He(e){let t=e.checks||[];t.forEach(r=>{let a=document.querySelector(`.prereq-item[data-site="${r.id}"]`);if(!a)return;let l=a.querySelector(".signal"),i=a.querySelector("small");l.className=`signal ${r.passed?"signal-pass":"signal-fail"}`,i&&(i.textContent=r.passed?"Active":"Needs sign-in"),a.title=`${r.message}. Final URL: ${r.finalUrl}`});let n=t.filter(r=>!r.passed);if(n.length===0&&t.length>0){s("prereqSummary").textContent="All prerequisite sessions are active.";return}if(t.length===0){s("prereqSummary").textContent="Session checks have not run yet.";return}s("prereqSummary").textContent=`${n.length} session check${n.length===1?"":"s"} need attention. Open the help tooltip for sign-in steps.`}async function rn(){S=await be(),A=await Ee(),S&&S.length&&(ve(S),j=!0,s("exportBtn")?.classList.remove("hidden"),s("clearResultsBtn")?.classList.remove("hidden")),A&&A.length?(ae(A),z=!0):ae([]);let e=await chrome.storage.local.get(b.STORAGE_KEYS.LAST_ACTION);B(e[b.STORAGE_KEYS.LAST_ACTION]==="review"?"review":"validation"),(await te()).length&&s("retryFailedBtn")?.classList.remove("hidden")}async function an(){await chrome.runtime.sendMessage({action:"CLEAR_RESULTS"}),S=[],ve(S),j=!1,s("retryFailedBtn")?.classList.add("hidden"),s("cancelBtn")?.classList.add("hidden"),s("progressContainer")?.classList.add("hidden"),s("progressFill").style.width="0%",s("progressText").textContent="Starting...",P()}async function on(){await chrome.runtime.sendMessage({action:"CLEAR_REVIEW_RESULTS"}),A=[],ae(A),z=!1,s("reviewBtn").disabled=!1,P()}async function ln(){let e=await te();e.length!==0&&(j=!1,s("progressContainer")?.classList.remove("hidden"),G({completed:0,total:selected.length,current:"Starting review",startedAt:Date.now()}),s("cancelBtn")?.classList.remove("hidden"),s("retryFailedBtn")?.classList.add("hidden"),await chrome.runtime.sendMessage({action:"START_VALIDATION",assessments:e}))}async function cn(e){let n=(await Ae())[e];if(!n)return;let r=new Blob([JSON.stringify(n,null,2)],{type:"application/json"}),a=URL.createObjectURL(r),l=document.createElement("a");l.href=a,l.download=`context_${e}.json`,l.click(),URL.revokeObjectURL(a)}async function dn(){!S||S.length===0||await Ce(S)}async function un(){let e=s("whatsNewIcon"),t=s("surveyDiffModal"),n=s("closeModalBtn"),r=s("refreshDiffBtn"),a=s("surveyFromSearch"),l=s("surveyToSearch"),i=s("runSurveyDiffBtn");!e||!t||!n||(e.addEventListener("click",async()=>{t.classList.remove("hidden");try{await pn()}catch(o){console.error("Survey diff modal restore error:",o),ge(),D(null,"Unable to load survey versions.")}}),n.addEventListener("click",()=>{t.classList.add("hidden")}),t.addEventListener("click",o=>{o.target===t&&t.classList.add("hidden")}),r&&r.addEventListener("click",fn),a?.addEventListener("focus",()=>{$("from"),s("surveyFromOptions")?.classList.remove("hidden")}),a?.addEventListener("input",()=>{p=null,w=null,l&&(l.value="",l.disabled=!0,l.placeholder="Select From first"),Z(),X(),U({selectedFromId:null,selectedToId:null,diff:null}),$("from"),s("surveyFromOptions")?.classList.remove("hidden")}),l?.addEventListener("focus",()=>{p&&($("to"),s("surveyToOptions")?.classList.remove("hidden"))}),l?.addEventListener("input",()=>{w=null,Z(),X(),U({selectedFromId:p?.surveyTemplateId||null,selectedToId:null,diff:null}),$("to"),s("surveyToOptions")?.classList.remove("hidden")}),i?.addEventListener("click",vn),document.addEventListener("click",o=>{o.target.closest(".survey-combobox")||(s("surveyFromOptions")?.classList.add("hidden"),s("surveyToOptions")?.classList.add("hidden"))}))}async function oe(){return(await chrome.storage.local.get(b.STORAGE_KEYS.WHATS_NEW_MODAL))[b.STORAGE_KEYS.WHATS_NEW_MODAL]||{}}async function U(e){let t=await oe();await chrome.storage.local.set({[b.STORAGE_KEYS.WHATS_NEW_MODAL]:{...t,...e,updatedAt:Date.now()}})}function Ue(e){return x.find(t=>Number(t.surveyTemplateId)===Number(e))||null}function mn(){let e=s("surveyFromSearch"),t=s("surveyToSearch");e&&(e.value=p?Y(p):""),t&&(t.value=w?Y(w):"",t.disabled=!p,t.placeholder=p?"Search newer versions...":"Select From first"),Z()}async function pn(){let e=await oe();Array.isArray(e.templates)&&e.templates.length>0&&(x=he(e.templates)),x.length===0&&(ge(),D(null,"Loading survey versions..."),await Ge()),p=e.selectedFromId?Ue(e.selectedFromId):null,w=e.selectedToId?Ue(e.selectedToId):null,p&&w&&w.versionNumber<=p.versionNumber&&(w=null),mn(),$("from"),e.diff&&p&&w?D(e.diff):D(null,"Select a From and To version, then click What's New.")}async function fn(){let e=s("refreshDiffBtn");if(!(!e||e.disabled)){e.disabled=!0,e.setAttribute("aria-busy","true"),J+=1;try{ge(),X(),await U({selectedFromId:null,selectedToId:null,diff:null,templates:[]}),await Ge(!0)}catch(t){console.error("Survey template refresh error:",t),D(null,"Unable to load survey versions.")}finally{e.disabled=!1,e.removeAttribute("aria-busy")}}}function he(e){return(Array.isArray(e)?e:Object.values(e||{})).filter(n=>n&&n.surveyTemplateId&&n.versionNumber!==void 0&&n.versionNumber!==null).map(n=>({...n,surveyTemplateId:Number(n.surveyTemplateId),versionNumber:Number(n.versionNumber)})).filter(n=>!Number.isNaN(n.surveyTemplateId)&&!Number.isNaN(n.versionNumber)).sort((n,r)=>r.versionNumber-n.versionNumber)}async function Ge(e=!1){if(x.length>0&&!e){$("from");return}if(!e){let n=await oe();if(Array.isArray(n.templates)&&n.templates.length>0){x=he(n.templates),$("from");return}}e&&(x=[]);let t=s("surveyFromSearch");t&&(t.placeholder="Loading versions...",t.disabled=!0);try{x=he(await Me()),await U({templates:x}),t&&(t.disabled=!1,t.placeholder="Search versions..."),$("from")}catch(n){throw console.error("Survey template load error:",n),t&&(t.disabled=!1,t.placeholder="Unable to load versions"),n}}function ge(){p=null,w=null;let e=s("surveyFromSearch"),t=s("surveyToSearch");e&&(e.value="",e.disabled=!1,e.placeholder="Search versions..."),t&&(t.value="",t.disabled=!0,t.placeholder="Select From first"),s("surveyFromOptions")?.classList.add("hidden"),s("surveyToOptions")?.classList.add("hidden"),s("surveyFromOptions")&&(s("surveyFromOptions").innerHTML=""),s("surveyToOptions")&&(s("surveyToOptions").innerHTML=""),Z()}function X(){let e=s("diffDateRange"),t=s("diffContent");e&&(e.textContent="",e.classList.add("hidden")),t&&(t.innerHTML="")}function Y(e){let t=e.releasedOn?F(e.releasedOn):"-",n=e.deactivatedOn?F(e.deactivatedOn):"-";return`Version-${e.versionNumber} (Released on: ${t}, Deactivated on: ${n})`}function wn(e){return e==="to"?p?x.filter(t=>t.versionNumber>p.versionNumber):[]:x}function $(e){let t=s(e==="from"?"surveyFromSearch":"surveyToSearch"),n=s(e==="from"?"surveyFromOptions":"surveyToOptions");if(!t||!n)return;let r=t.value.trim().toLowerCase(),a=wn(e).filter(l=>Y(l).toLowerCase().includes(r));if(n.innerHTML="",a.length===0){let l=document.createElement("div");l.className="survey-option-empty",l.textContent=x.length===0?"No survey versions found.":"No matching versions.",n.appendChild(l);return}a.forEach(l=>{let i=document.createElement("button");i.type="button",i.className="survey-option",i.value=String(l.surveyTemplateId),i.textContent=Y(l),i.addEventListener("click",()=>{hn(e,l)}),n.appendChild(i)})}function hn(e,t){if(e==="from"){p=t,w=null;let n=s("surveyFromSearch"),r=s("surveyToSearch");n&&(n.value=Y(t)),r&&(r.value="",r.disabled=!1,r.placeholder="Search newer versions..."),s("surveyFromOptions")?.classList.add("hidden"),$("to"),X(),U({selectedFromId:t.surveyTemplateId,selectedToId:null,diff:null})}else{w=t;let n=s("surveyToSearch");n&&(n.value=Y(t)),s("surveyToOptions")?.classList.add("hidden"),X(),U({selectedFromId:p?.surveyTemplateId||null,selectedToId:t.surveyTemplateId,diff:null})}Z()}function Z(){let e=s("runSurveyDiffBtn");e&&e.classList.toggle("hidden",!p||!w)}async function vn(){if(!p||!w)return;let e=s("runSurveyDiffBtn"),t=J+1;J=t,e&&(e.disabled=!0,e.textContent="Loading...");try{let n=await oe();if(n.diff&&Number(n.selectedFromId)===Number(p.surveyTemplateId)&&Number(n.selectedToId)===Number(w.surveyTemplateId)){D(n.diff);return}D(null,"Loading changes...");let r=await Be(p.surveyTemplateId,w.surveyTemplateId);t===J&&(D(r),await U({selectedFromId:p.surveyTemplateId,selectedToId:w.surveyTemplateId,diff:r}))}catch(n){console.error("Survey diff error:",n),t===J&&D(null,"Unable to load survey differences.")}finally{e&&(e.disabled=!1,e.textContent="What's New")}}function D(e,t="No changes detected between the selected survey templates."){let n=s("diffDateRange"),r=s("diffContent");if(!n||!r)return;if(r.innerHTML="",!e||e.newQuestions.length===0&&e.removedQuestions.length===0&&e.modifiedQuestions.length===0){n.classList.add("hidden");let i=document.createElement("div");i.className="diff-empty",i.textContent=t,r.appendChild(i);return}let a=e.metadata.fromReleasedOn||e.metadata.fromUpdatedOn?F(e.metadata.fromReleasedOn||e.metadata.fromUpdatedOn):"Unknown",l=e.metadata.toReleasedOn||e.metadata.toUpdatedOn?F(e.metadata.toReleasedOn||e.metadata.toUpdatedOn):"Unknown";n.textContent=`From V-${e.metadata.fromVersionNumber||e.metadata.fromId} (${a}) to V-${e.metadata.toVersionNumber||e.metadata.toId} (${l})`,n.classList.remove("hidden"),e.newQuestions.forEach(i=>{let o=document.createElement("div");o.className="diff-item",o.innerHTML=`
            <h4><span class="diff-tag new">New Question</span> <span class="diff-id">[${i.alternateQuestionId}]</span></h4>
            <div class="diff-detail"><strong>Context:</strong> ${i.questionText||"\u2014"}</div>
        `,r.appendChild(o)}),e.removedQuestions.forEach(i=>{let o=document.createElement("div");o.className="diff-item",o.innerHTML=`
            <h4><span class="diff-tag removed">Removed Question</span> <span class="diff-id">[${i.alternateQuestionId}]</span></h4>
            <div class="diff-detail"><strong>Context:</strong> ${i.questionText||"\u2014"}</div>
        `,r.appendChild(o)}),e.modifiedQuestions.forEach(i=>{let o=document.createElement("div");o.className="diff-item";let d="",c="";i.textChanged&&(d+='<span class="diff-tag changed">Question Changed</span>',c+=`
                <div class="diff-detail"><strong>Old:</strong> ${i.textChanged.old}</div>
                <div class="diff-detail"><strong>New:</strong> ${i.textChanged.new}</div>
            `),i.optionsChanged&&(d+='<span class="diff-tag changed">Options Changed</span>',i.optionsChanged.added?.length>0&&(c+=`<div class="diff-detail"><strong>Added Options:</strong> ${i.optionsChanged.added.join(", ")}</div>`),i.optionsChanged.removed?.length>0&&(c+=`<div class="diff-detail"><strong>Removed Options:</strong> ${i.optionsChanged.removed.join(", ")}</div>`)),o.innerHTML=`
            <h4>${d} <span class="diff-id">[${i.alternateQuestionId}]</span></h4>
            ${c}
        `,r.appendChild(o)})}
