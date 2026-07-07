var b={VERSION:"1.0.0",MAX_CONCURRENT_VALIDATIONS:5,STORAGE_KEYS:{SETTINGS:"settings",ASSESSMENTS:"assessments",SELECTED_ASSESSMENTS:"selectedAssessments",CONTEXTS:"contexts",VALIDATIONS:"validations",REVIEWS:"reviews",LAST_RUN:"lastRun",LAST_ACTION:"lastAction",DEBUG:"debug",WHATS_NEW_MODAL:"whatsNewModalState"}},ee={PRIMARY_ASSESSMENTS:"https://cairois.web.boeing.com/api/asset/4/82/assessment/type/35",ASSESSMENT_DETAIL:"https://cairois.web.boeing.com/api/assessment/{id}/detail",ASSESSMENT_ANSWERS:"https://cairois.web.boeing.com/api/assessment/survey/{id}/answers",ASSESSMENT_CONTACTS:"https://cairois.web.boeing.com/api/assessment/{id}/contacts",SURVEY_TEMPLATE_QUESTIONS:"https://cairois.web.boeing.com/api/survey/template/{id}/questions",SURVEY_TEMPLATE_DETAIL:"https://cairois.web.boeing.com/api/surveyTemplate/{id}",SURVEY_TEMPLATES_RP_APP:"https://cairois.web.boeing.com/api/surveyTemplate?where=alternateSurveyTemplateId:=:rp-app",REVIEW_SUMMARY:"https://cairois.web.boeing.com/api/asset/4/{assetId}/assessment/review/summaries?assessmentTypeId=35&reviewTypeId=6",ESATS_VERSIONS:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationVersion/GetBusinessApplicationVersions?esatsId={assetId}",ESATS_ARTIFACTS:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationVersionDocument/GetBusinessApplicationVersionPolicyAndArtifacts?esatsId={versionEsatsId}",ESATS_CONTACT_DETAILS_SUMMARY:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationSummary/GetContactDetailsSummary?esatsId={assetId}",GTC_LOOKUP:"https://termbank.web.boeing.com/ses/v1.2/GlobalTradeControlVocabularies/name/{name}.json"},ke=[{id:"cairo",name:"Cairo",url:ee.PRIMARY_ASSESSMENTS,openUrl:"https://cairois.web.boeing.com/",expectedHosts:["cairois.web.boeing.com"]},{id:"esats",name:"ESATS",url:"https://service-gateway.tas-phx.apps.boeing.com/",openUrl:"https://esats.web.boeing.com/",expectedHosts:["service-gateway.tas-phx.apps.boeing.com","esats.web.boeing.com"]},{id:"gtc",name:"GTC",url:"https://termbank.web.boeing.com/",openUrl:"https://gtc-ecm.web.boeing.com/",expectedHosts:["termbank.web.boeing.com","gtc-ecm.web.boeing.com"]}];async function we(e){return(await chrome.storage.local.get(e))[e]}async function De(){return await we(b.STORAGE_KEYS.ASSESSMENTS)||[]}async function Me(){return await we(b.STORAGE_KEYS.VALIDATIONS)||[]}async function Fe(){return await we(b.STORAGE_KEYS.REVIEWS)||[]}async function ie(){return(await chrome.storage.local.get("failedAssessments")).failedAssessments||[]}async function Be(){return(await chrome.storage.local.get("assessmentContexts")).assessmentContexts||{}}function Pe(e,t){let n=[...e];if(t.search&&t.search.trim())if(t.regexMode)try{let s=new RegExp(t.search,"i");n=n.filter(r=>s.test(r.assetName||""))}catch{return[]}else{let s=t.search.toLowerCase();n=n.filter(r=>(r.assetName||"").toLowerCase().includes(s))}return t.fromDate&&(n=n.filter(s=>{let r=_e(s,t.dateFilterField);return!!r&&r>=t.fromDate})),t.toDate&&(n=n.filter(s=>{let r=_e(s,t.dateFilterField);return!!r&&r<=t.toDate})),t.assessmentStatus&&(n=n.filter(s=>{let r=le(s);return!(t.assessmentStatus==="incomplete"&&!r||t.assessmentStatus==="completed"&&r)})),n}function le(e){return!!(e.incompleteAssessmentId||e.hasIncomplete)}function lt(e,t){return t==="dueOn"?e.dueOn||e.raw?.dueOn:e.surveyCompletedOn||e.raw?.surveyCompletedOn}function _e(e,t){let n=lt(e,t);if(!n)return"";let r=String(n).match(/^\d{4}-\d{2}-\d{2}/);if(r)return r[0];let l=new Date(n);return Number.isNaN(l.getTime())?"":[l.getFullYear(),String(l.getMonth()+1).padStart(2,"0"),String(l.getDate()).padStart(2,"0")].join("-")}function Ue(e){return e.map(t=>t.assessmentId)}var ct=chrome.runtime.getURL("assets/encoded_data.txt");async function qe(e){let t=Array.isArray(e)?e:[],n=await dt(),s=n.worksheets[0],r=n.addWorksheet("All Assessments"),l=new Map;for(let i=0;i<t.length;i++){let d=t[i],c=Qe(d),N=vt(c,i);l.set(c.assessmentId,N);let w=ft(n,s,N);pt(w,d,c)}ut(r,t,l),n.removeWorksheet(s.id),n.calcProperties.fullCalcOnLoad=!0,n.calcProperties.calcMode="auto";let o=await n.xlsx.writeBuffer();gt(o,`Risk_Profiler_Quality_List_${ht()}.xlsx`)}async function dt(){let t=(await(await fetch(ct)).text()).trim(),n=Uint8Array.from(atob(t),r=>r.charCodeAt(0)),s=new ExcelJS.Workbook;return await s.xlsx.load(n.buffer),s}function ut(e,t,n){e.columns=[{header:"Open",key:"open",width:15},{header:"Assessment ID",key:"assessmentId",width:18},{header:"Application",key:"application",width:40},{header:"Asset ID",key:"assetId",width:15},{header:"Lifecycle",key:"lifecycle",width:20},{header:"Application Manager",key:"manager",width:30},{header:"Business System Owner",key:"owner",width:30},{header:"Survey Completed Date",key:"surveyCompletedDate",width:22},{header:"Attested Date",key:"attestedDate",width:22},{header:"Status",key:"status",width:15},{header:"Attested By",key:"attestedBy",width:30},{header:"Passed",key:"passed",width:12},{header:"Failed",key:"failed",width:12},{header:"N/A",key:"na",width:12},{header:"Score",key:"score",width:12},{header:"Error",key:"error",width:60}],t.forEach(s=>{let r=Qe(s),l=s.summary||{},o=(s.results||[]).filter(h=>h.status==="FAIL").map(h=>`${h.id}: ${h.reason}`),i=(s.results||[]).filter(h=>h.reason==="Question identifier was not found in the survey questions.").map(h=>h.id),d=[s.error,i.length?`Missing Questions: ${i.join(", ")}`:"",o.length?o.join(" | "):""].filter(Boolean).join(" | "),c=e.addRow({open:"Open",assessmentId:r.assessmentId,application:r.assetName,assetId:r.assetId,lifecycle:r.lifeCycle,manager:r.appMgrName,owner:r.sysOwnerName,surveyCompletedDate:ve(r.surveyCompletedOn),attestedDate:ve(r.attestOn),status:r.hasIncomplete?"Incomplete":"Completed",attestedBy:r.attestName||"",passed:l.passed||0,failed:l.failed||0,na:l.na||0,score:l.score?`${l.score}%`:"",error:d}),N=n.get(r.assessmentId),w=c.getCell(1);w.value={text:"Open",hyperlink:`#'${N}'!A1`},w.font={color:{argb:"FF0563C1"},underline:!0}}),e.getRow(1).font={bold:!0}}function pt(e,t,n){e.getCell("C2").value=n.assetName||"",e.getCell("C3").value=n.assetId||"",e.getCell("C4").value=n.appMgrName||"",e.getCell("C5").value=ve(new Date);let s=mt(e);(t.results||[]).forEach(r=>{let l=s[String(r.id).toUpperCase()];if(!l)return;let o=e.getCell(`A${l}`);o.value=wt(r.status);let i=String(r.status||"").toUpperCase();i==="PASS"?(o.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF00A300"}},o.font={color:{argb:"ff000000"},bold:!0}):i==="FAIL"?(o.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFF0000"}},o.font={color:{argb:"ff000000"},bold:!0}):i==="NA"&&(o.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFD9D9D9"}},o.font={color:{argb:"ff000000"},italic:!0}),e.getCell(`D${l}`).value=r.reason||""})}function mt(e){let t={};return e.eachRow((n,s)=>{let r=String(n.getCell(2).value||"").trim().toUpperCase();/^RP\d+$/.test(r)&&(t[r]=s)}),t}function ft(e,t,n){let s=e.addWorksheet(n);return t.properties&&(s.properties=JSON.parse(JSON.stringify(t.properties))),t.pageSetup&&(s.pageSetup=JSON.parse(JSON.stringify(t.pageSetup))),t.views&&(s.views=JSON.parse(JSON.stringify(t.views))),t.columns.forEach((r,l)=>{let o=s.getColumn(l+1);o.width=r.width,o.hidden=r.hidden,o.outlineLevel=r.outlineLevel}),t.eachRow({includeEmpty:!0},(r,l)=>{let o=s.getRow(l);o.height=r.height,o.hidden=r.hidden,o.outlineLevel=r.outlineLevel,r.eachCell({includeEmpty:!0},(i,d)=>{let c=o.getCell(d);if(typeof i.value=="object"&&i.value!==null)try{c.value=JSON.parse(JSON.stringify(i.value))}catch{c.value=i.text||""}else c.value=i.value;try{c.style=JSON.parse(JSON.stringify(i.style||{}))}catch{c.style={}}if(i.alignment)try{c.alignment=JSON.parse(JSON.stringify(i.alignment))}catch{}if(i.font)try{c.font=JSON.parse(JSON.stringify(i.font))}catch{}if(i.border)try{c.border=JSON.parse(JSON.stringify(i.border))}catch{}if(i.fill)try{c.fill=JSON.parse(JSON.stringify(i.fill))}catch{}if(i.numFmt&&(c.numFmt=i.numFmt),i.protection)try{c.protection=JSON.parse(JSON.stringify(i.protection))}catch{}})}),t.model?.merges&&t.model.merges.forEach(r=>{try{s.mergeCells(r)}catch{}}),s}function wt(e){switch(String(e||"").toUpperCase()){case"PASS":return"Yes";case"FAIL":return"No";case"NA":return"N/A";default:return""}}function Qe(e){return{...e.assessment||{},assessmentId:e.assessmentId,assetName:e.assetName,...e.assessment||{}}}function vt(e,t){return(e.assetName||`Assessment ${t+1}`).replace(/[\\/?*[\]:]/g," ").trim().slice(0,31)}function ve(e){if(!e)return"";try{return new Date(e).toLocaleDateString()}catch{return e}}function ht(){let e=new Date,t=n=>String(n).padStart(2,"0");return`${e.getFullYear()}${t(e.getMonth()+1)}${t(e.getDate())}_${t(e.getHours())}${t(e.getMinutes())}${t(e.getSeconds())}`}function gt(e,t){let n=new Blob([e],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),s=URL.createObjectURL(n),r=document.createElement("a");r.href=s,r.download=t,r.click(),setTimeout(()=>URL.revokeObjectURL(s),1e3)}var Se="http://schemas.openxmlformats.org/wordprocessingml/2006/main",yt="http://schemas.microsoft.com/office/word/2010/wordml",St="http://schemas.openxmlformats.org/markup-compatibility/2006",At=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`,Et=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,bt=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,Tt=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${Se}">
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
</w:styles>`,Nt=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${Se}">
    <w:updateFields w:val="true"/>
</w:settings>`,Ve=new TextEncoder,xt=Bt();async function He(e){let t=new Blob([Ct(e)],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),n=URL.createObjectURL(t),s=document.createElement("a");s.href=n,s.download=`${Ut(e?.assetName||"application")}_RISK-PRofiler_review_notes.docx`,s.click(),URL.revokeObjectURL(n)}function Ct(e){return Ft([{name:"[Content_Types].xml",content:At},{name:"_rels/.rels",content:Et},{name:"word/document.xml",content:Lt(e)},{name:"word/_rels/document.xml.rels",content:bt},{name:"word/styles.xml",content:Tt},{name:"word/settings.xml",content:Nt}])}function Lt(e){let t=e?.contacts||[],n=[T([g(`${e?.assetName||"Application"} Risk Profiler Review Notes`,{bold:!0})],{style:"Title",spacingAfter:260}),T([g("Application Details",{bold:!0})],{style:"Heading1"}),It([["Application Name",e?.assetName||"N/A"],["Due Date",ge(e?.dueOn)||"N/A"],["Survey Completed On (Last)",ge(e?.surveyCompletedOn)||"N/A"],["Review Assessment Date",ge(e?.reviewedAt)||"N/A"]]),T([g("Contacts",{bold:!0})],{style:"Heading1",spacingBefore:180}),Rt(t),T([g("Review Output",{bold:!0})],{style:"Heading1",spacingBefore:220}),Ot(e?.workQueue||[])].join("");return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
    xmlns:w="${Se}"
    xmlns:w14="${yt}"
    xmlns:mc="${St}"
    mc:Ignorable="w14">
    <w:body>
        ${n}
        <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
        </w:sectPr>
    </w:body>
</w:document>`}function Rt(e){if(e.length===0)return T([g("No Application Manager or Business System Manager details were found.")]);let t=[ce([I("Contact Type",{bold:!0,fill:"E8EEFC"}),I("Name",{bold:!0,fill:"E8EEFC"}),I("BEMS ID",{bold:!0,fill:"E8EEFC"}),I("Email",{bold:!0,fill:"E8EEFC"})]),...e.map(n=>ce([I(n.contactType||"N/A"),I(n.associatedTo||"N/A"),I(n.bemsId||"N/A"),I(n.email||"N/A")]))];return Ae(t)}function It(e){return Ae(e.map(([t,n])=>ce([I(t,{bold:!0,fill:"F3F4F6"}),I(n)])))}function Ot(e){return e.length===0?T([g("No reachable unanswered work queue items were found.")]):e.map((t,n)=>[t.status?T([g(t.status,{bold:!0,color:"315FD6"})],{spacingBefore:n===0?80:180,spacingAfter:80}):"",kt(t.questionGroup||"N/A",t.questionId||"N/A"),he("Question",t.question||"N/A"),he("Answer Type",t.answerType||"N/A"),t.asaNotes?he("ASA Notes",t.asaNotes):"",T([g("Options",{bold:!0})]),...$t(t.options||[]),Mt()].join("")).join("")}function $t(e){return(e.length?e:[{index:1,internalValue:"<no options>"}]).map(n=>T([Dt(),g(` ${n.index||""}. ${n.internalValue||n.displayValue||"<no options>"}`)],{indentLeft:360,spacingAfter:70}))}function kt(e,t){return Ae([ce([ye([g("Category: ",{bold:!0}),g(e)]),ye([g("Question ID: ",{bold:!0}),g(t)],{align:"right"})])],{noBorders:!0})}function he(e,t){return T([g(`${e}: `,{bold:!0}),g(t)])}function Dt(){return`
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
        </w:sdt>`}function Mt(){return T([],{borderBottom:!0,spacingBefore:80,spacingAfter:140})}function T(e,t={}){let n=[];return t.style&&n.push(`<w:pStyle w:val="${je(t.style)}"/>`),t.align&&n.push(`<w:jc w:val="${t.align}"/>`),(t.spacingBefore||t.spacingAfter)&&n.push(`<w:spacing w:before="${t.spacingBefore||0}" w:after="${t.spacingAfter||0}"/>`),t.indentLeft&&n.push(`<w:ind w:left="${t.indentLeft}"/>`),t.borderBottom&&n.push('<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/></w:pBdr>'),`<w:p>${n.length?`<w:pPr>${n.join("")}</w:pPr>`:""}${e.join("")}</w:p>`}function g(e,t={}){let n=[];return t.bold&&n.push("<w:b/>"),t.color&&n.push(`<w:color w:val="${t.color}"/>`),`<w:r>${n.length?`<w:rPr>${n.join("")}</w:rPr>`:""}<w:t xml:space="preserve">${je(e)}</w:t></w:r>`}function Ae(e,t={}){return`<w:tbl>
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
    </w:tbl>`}function ce(e){return`<w:tr>${e.join("")}</w:tr>`}function I(e,t={}){return ye([g(e||"",{bold:t.bold})],t)}function ye(e,t={}){let n=['<w:tcW w:w="2500" w:type="pct"/>','<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>'];return t.fill&&n.push(`<w:shd w:fill="${t.fill}"/>`),`<w:tc><w:tcPr>${n.join("")}</w:tcPr>${T(e,{align:t.align})}</w:tc>`}function Ft(e){let t=0,n=[],s=[];e.forEach(o=>{let i=Ve.encode(o.name),d=Ve.encode(o.content),c=_t(d);n.push(A(67324752),m(20),m(0),m(0),m(0),m(0),A(c),A(d.length),A(d.length),m(i.length),m(0),i,d),s.push(A(33639248),m(20),m(20),m(0),m(0),m(0),m(0),A(c),A(d.length),A(d.length),m(i.length),m(0),m(0),m(0),m(0),A(0),A(t),i),t+=30+i.length+d.length});let r=Ge(s),l=[A(101010256),m(0),m(0),m(e.length),m(e.length),A(r),A(t),m(0)];return Pt([...n,...s,...l])}function Bt(){let e=[];for(let t=0;t<256;t+=1){let n=t;for(let s=0;s<8;s+=1)n=n&1?3988292384^n>>>1:n>>>1;e[t]=n>>>0}return e}function _t(e){let t=4294967295;for(let n of e)t=xt[(t^n)&255]^t>>>8;return(t^4294967295)>>>0}function m(e){let t=new Uint8Array(2);return new DataView(t.buffer).setUint16(0,e,!0),t}function A(e){let t=new Uint8Array(4);return new DataView(t.buffer).setUint32(0,e>>>0,!0),t}function Pt(e){let t=Ge(e),n=new Uint8Array(t),s=0;return e.forEach(r=>{n.set(r,s),s+=r.length}),n}function Ge(e){return e.reduce((t,n)=>t+n.length,0)}function je(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function ge(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"2-digit"})}function Ut(e){return String(e).trim().replace(/[\\/:*?"<>|]+/g,"_").replace(/\s+/g,"_").replace(/^_+|_+$/g,"")||"application"}function Ee(e,t){let n=e;return Object.entries(t).forEach(([s,r])=>{n=n.replace(`{${s}}`,r)}),n}var te=new Map,qt="https://esats.web.boeing.com",Qt="service-gateway.tas-phx.apps.boeing.com",Vt="https://gtc-ecm.web.boeing.com",Ht="termbank.web.boeing.com",Gt={retries:3,retryDelay:1e3,useCache:!0};function jt(e){return new Promise(t=>setTimeout(t,e))}function Kt(e){try{return new URL(e).hostname===Qt}catch{return!1}}function Yt(e){try{return new URL(e).hostname===Ht}catch{return!1}}function Wt(){return typeof chrome<"u"&&chrome.tabs&&chrome.scripting}function Jt(e){return new Promise(t=>{chrome.tabs.query(e,t)})}async function zt(e){let t=await Jt({url:`${e}/*`});return t.find(n=>n.id&&n.status==="complete")||t.find(n=>n.id)}function Xt(e){return new Promise((t,n)=>{chrome.scripting.executeScript(e,s=>{let r=chrome.runtime.lastError;if(r){n(new Error(r.message));return}t(s)})})}async function Ke(e,{pageOrigin:t,label:n,useBearerToken:s}){if(!Wt())throw new Error(`${n} requests require the Chrome scripting permission.`);let r=await zt(t);if(!r)throw new Error(`Open ${n} in this browser and sign in before running ${n} validation requests.`);let o=(await Xt({target:{tabId:r.id},world:"MAIN",args:[e,s,t],func:async(i,d,c)=>{function N(R){if(!R)return null;let S=String(R).trim();S.startsWith("Bearer ")&&(S=S.slice(7).trim());try{let p=JSON.parse(S);typeof p=="string"?S=p.trim():p&&typeof p=="object"&&(S=p.esatsToken||p.access_token||p.token||p.value||S)}catch{}return S||null}let w=d?N(localStorage.getItem("esatsToken")):null,h={Accept:"application/json, text/plain, */*"};d&&w&&(h.Authorization=`Bearer ${w}`);try{let p=null,H=null;for(let K=1;K<=3;K++){try{if(p=await fetch(i,{method:"GET",headers:h,credentials:"omit",cache:"no-store",referrer:`${c}/`,referrerPolicy:"strict-origin-when-cross-origin"}),p.ok)break;H=new Error(`${p.status} ${p.statusText}`)}catch(x){H=x}K<3&&await new Promise(x=>setTimeout(x,1e3))}if(!p||!p.ok)throw H||new Error("Request failed");let G=await p.text(),j=null;if(G)try{j=JSON.parse(G)}catch{j=G}return{ok:p.ok,status:p.status,statusText:p.statusText,url:p.url,hasAuthorization:d?!!w:!0,data:j}}catch(R){return console.log("ESATS token:",w),console.log("Request URL:",i),console.log("Headers:",h),{ok:!1,status:0,statusText:R.message||"Request failed",hasAuthorization:d?!!w:!0,error:R.message}}}}))?.[0]?.result;if(!o)throw new Error(`${n} request did not return a response.`);if(!o.ok){let i=o.hasAuthorization?"":" No ESATS bearer token was found in the ESATS tab.";throw new Error(`${n} request failed: ${o.status} ${o.statusText}.${i}`)}return o.data}async function Zt(e){return Ke(e,{pageOrigin:qt,label:"ESATS",useBearerToken:!0})}async function en(e){return Ke(e,{pageOrigin:Vt,label:"GTC",useBearerToken:!1})}async function de(e,t={}){let n={...Gt,...t};if(n.useCache&&te.has(e))return te.get(e);let s;for(let r=1;r<=n.retries;r++)try{if(Kt(e)){let i=await Zt(e);return n.useCache&&te.set(e,i),i}if(Yt(e)){let i=await en(e);return n.useCache&&te.set(e,i),i}let l=await fetch(e,{credentials:"include",headers:{Accept:"application/json, text/plain, */*"},cache:"no-store"});if(!l.ok)throw new Error(`${l.status} ${l.statusText}`);let o=await l.json();return n.useCache&&te.set(e,o),o}catch(l){s=l,r<n.retries&&await jt(n.retryDelay)}throw s}async function be(e){if(!e)return[];let t=Ee(ee.SURVEY_TEMPLATE_QUESTIONS,{id:e});return de(t)}async function Te(e){if(!e)return null;let t=Ee(ee.SURVEY_TEMPLATE_DETAIL,{id:e});return de(t)}async function Ye(){return de(ee.SURVEY_TEMPLATES_RP_APP,{useCache:!1})}function We(e){let t=new Map;for(let n of e)n.alternateQuestionId&&t.set(n.alternateQuestionId,n);return t}async function Je(e,t){if(!e||!t)throw new Error("Both survey template IDs are required.");if(Number(e)===Number(t))return{metadata:{fromId:Number(e),toId:Number(t)},newQuestions:[],removedQuestions:[],modifiedQuestions:[]};let[n,s,r,l]=await Promise.all([Te(e),be(e),Te(t),be(t)]);if(!n||!r)throw new Error("Unable to load one or both survey template details.");let o=We(s||[]),i=We(l||[]),d=new Set([...o.keys(),...i.keys()]),c=Array.from(d).sort(),N={metadata:{fromId:Number(e),fromVersionNumber:n.versionNumber,fromUpdatedOn:n.updatedOn,fromReleasedOn:n.releasedOn,toId:Number(t),toVersionNumber:r.versionNumber,toUpdatedOn:r.updatedOn,toReleasedOn:r.releasedOn},newQuestions:[],removedQuestions:[],modifiedQuestions:[]};for(let w of c)if(!o.has(w))N.newQuestions.push({alternateQuestionId:w,questionText:i.get(w).questionText});else if(!i.has(w))N.removedQuestions.push({alternateQuestionId:w,questionText:o.get(w).questionText});else{let h=o.get(w),R=i.get(w),S=!1,p={alternateQuestionId:w};h.questionText!==R.questionText&&(p.textChanged={old:h.questionText,new:R.questionText},S=!0);let H=new Set((h.options||[]).map(x=>x.displayValue)),G=new Set((R.options||[]).map(x=>x.displayValue)),j=[...G].filter(x=>!H.has(x)),K=[...H].filter(x=>!G.has(x));(j.length>0||K.length>0)&&(p.optionsChanged={added:j,removed:K},S=!0),S&&N.modifiedQuestions.push(p)}return N}var P=[],D=[],xe=[],J="",$=[],E=[],L=[],z=!1,se=!1,O="validation",u=null,_={},W={},C=[],f=null,v=null,ne=0,a=e=>document.getElementById(e);document.addEventListener("DOMContentLoaded",tn);async function tn(){await Ze(),await gn(),an(),await In(),rt(),wn(),$n(),_n()}async function Ze(){P=await De(),D=[...P],nn(),oe()}function nn(){xe=[...new Set(P.map(e=>e.appMgrName))].filter(Boolean).sort(),me()}function sn(e){let t=a("ownerOptions");if(!t)return;t.innerHTML="";let n=document.createElement("button");n.type="button",n.className="manager-option",n.textContent="All Application Managers",n.addEventListener("click",()=>{J="",a("ownerSearchInput").value="",ue(),k()}),t.appendChild(n),e.forEach(s=>{let r=document.createElement("button");r.type="button",r.className="manager-option",r.textContent=s,r.addEventListener("click",()=>{J=s,a("ownerSearchInput").value=s,ue(),k()}),t.appendChild(r)})}function et(){let e=a("ownerSearchInput")?.value?.trim()||"";if(!e)return null;try{return new RegExp(e,"i")}catch{return null}}function me(){let e=et(),t=e?xe.filter(n=>e.test(n)):xe;sn(t)}function ze(){me(),a("ownerOptions")?.classList.remove("hidden")}function ue(){a("ownerOptions")?.classList.add("hidden")}function an(){a("searchInput")?.addEventListener("input",k),a("regexMode")?.addEventListener("change",k),a("fromDate")?.addEventListener("change",k),a("toDate")?.addEventListener("change",k),a("dateFilterField")?.addEventListener("change",k),a("assessmentStatusFilter")?.addEventListener("change",k),a("ownerSearchInput")?.addEventListener("focus",ze),a("ownerSearchInput")?.addEventListener("input",()=>{J="",me(),ze(),k()}),a("ownerSearchInput")?.addEventListener("keydown",e=>{e.key==="Escape"&&ue()}),document.addEventListener("click",e=>{e.target.closest(".manager-search-select")||ue()}),a("clearFiltersBtn")?.addEventListener("click",rn),a("refreshBtn")?.addEventListener("click",pn),a("checkPrereqBtn")?.addEventListener("click",rt),a("selectAllBtn")?.addEventListener("click",dn),a("clearSelectionBtn")?.addEventListener("click",un),a("validateBtn")?.addEventListener("click",mn),a("reviewBtn")?.addEventListener("click",fn),a("cancelBtn")?.addEventListener("click",async()=>{await chrome.runtime.sendMessage({action:"STOP_VALIDATION"})}),a("cancelReviewBtn")?.addEventListener("click",async()=>{await chrome.runtime.sendMessage({action:"STOP_REVIEW"})}),a("retryFailedBtn")?.addEventListener("click",Mn),a("clearResultsBtn")?.addEventListener("click",kn),a("clearReviewResultsBtn")?.addEventListener("click",Dn),a("exportBtn")?.addEventListener("click",Bn),a("validationTabBtn")?.addEventListener("click",()=>U("validation")),a("reviewTabBtn")?.addEventListener("click",()=>U("review")),a("closeReviewNotesModalBtn")?.addEventListener("click",Ce),a("reviewNotesModal")?.addEventListener("click",e=>{e.target===a("reviewNotesModal")&&Ce()}),a("copyReviewNotesBtn")?.addEventListener("click",Ln),a("selectAllReviewNotesBtn")?.addEventListener("click",Tn),a("downloadReviewNotesBtn")?.addEventListener("click",vn),Rn()}function k(){let e={search:a("searchInput")?.value||"",regexMode:a("regexMode")?.checked||!1,fromDate:a("fromDate")?.value||"",toDate:a("toDate")?.value||"",dateFilterField:a("dateFilterField")?.value||"surveyCompletedOn",assessmentStatus:a("assessmentStatusFilter")?.value||""};if(D=Pe(P,e),J)D=D.filter(t=>t.appMgrName===J);else{let t=et();t&&(D=D.filter(n=>t.test(n.appMgrName||"")))}oe()}function rn(){a("searchInput").value="",a("regexMode").checked=!1,a("fromDate").value="",a("toDate").value="",a("dateFilterField").value="surveyCompletedOn",a("assessmentStatusFilter").value="",a("ownerSearchInput").value="",J="",me(),D=[...P],oe()}function oe(){let e=a("assessmentList");e.innerHTML="",D.forEach(t=>{let n=ln(t),s=document.createElement("div");s.className=`assessment-row ${n.className}`,s.innerHTML=`

                <input
                    type="checkbox"
                    class="assessment-checkbox"
                    data-id="${t.assessmentId}"
                    ${$.includes(t.assessmentId)?"checked":""}
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
                        ${on(t)}
                    </div>

                    <div class="asset-sub status-detail">

                        ${n.detail}

                    </div>

                </div>

            `,e.appendChild(s)}),cn(),tt()}function on(e){let t=B(e.dueOn||e.raw?.dueOn)||"N/A";if(le(e))return`<strong>Incomplete initiated date:</strong> ${B(e.incompleteInitiatedOn||e.raw?.incompleteInitiatedOn)||"N/A"} \u2022 <strong>Due on:</strong> ${t}`;let n=B(e.surveyCompletedOn||e.raw?.surveyCompletedOn)||"N/A";return`<strong>Due on:</strong> ${t} \u2022 <strong>Survey Completed(Last):</strong> ${n}`}function ln(e){if(le(e)){let r=e.incompleteInitiatedByName||e.raw?.incompleteInitiatedByName||"N/A",l=e.incompleteInitiatedOn||e.raw?.incompleteInitiatedOn;return{label:"Incomplete",className:"status-incomplete",detail:`Incomplete mark \u2022 Initiated by ${r}${l?` \u2022 ${B(l)}`:""}`}}let n=e.attestName||e.raw?.attestName||"N/A",s=e.attestOn||e.raw?.attestOn;return{label:"Completed",className:"status-completed",detail:`Attested by ${n}${s?` \u2022 ${B(s)}`:""}`}}function B(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?e:t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"2-digit"})}function cn(){document.querySelectorAll(".assessment-checkbox").forEach(e=>{e.addEventListener("change",t=>{let n=Number(t.target.dataset.id);t.target.checked?$.includes(n)||$.push(n):$=$.filter(s=>s!==n),tt()})})}function tt(){a("selectedCount").textContent=`${$.length} Selected`}function dn(){$=Ue(D),oe()}function un(){$=[],oe()}async function pn(){a("refreshBtn").disabled=!0;try{await chrome.runtime.sendMessage({action:"REFRESH_ASSESSMENTS"}),await Ze()}finally{a("refreshBtn").disabled=!1}}async function mn(){let e=P.filter(t=>$.includes(t.assessmentId));if(e.length===0){alert("Select at least one assessment.");return}z=!1,U("validation"),a("progressContainer")?.classList.remove("hidden"),a("cancelBtn")?.classList.remove("hidden"),a("cancelReviewBtn")?.classList.add("hidden"),a("retryFailedBtn")?.classList.add("hidden"),await chrome.runtime.sendMessage({action:"START_VALIDATION",assessments:e})}async function fn(){let e=P.filter(t=>$.includes(t.assessmentId));if(e.length===0){alert("Select at least one assessment.");return}se=!1,U("review"),a("progressContainer")?.classList.remove("hidden"),Y({completed:0,total:e.length,current:"Starting review",startedAt:Date.now(),type:"review"}),a("cancelReviewBtn")?.classList.remove("hidden"),a("cancelBtn")?.classList.add("hidden"),a("retryFailedBtn")?.classList.add("hidden"),a("reviewBtn").disabled=!0,await chrome.runtime.sendMessage({action:"START_REVIEW",assessments:e})}function wn(){setInterval(async()=>{let e=await chrome.storage.local.get(["validationProgress","validationComplete","validationResults","validationError","reviewProgress","reviewComplete","reviewResults","reviewError",b.STORAGE_KEYS.LAST_ACTION]),t=e[b.STORAGE_KEYS.LAST_ACTION]||O;t==="validation"&&e.validationProgress&&!e.validationComplete&&Y(e.validationProgress,"validation"),e.validationComplete&&!z&&(E=e.validationResults||[],Ie(E),z=!0,U("validation"),a("exportBtn")?.classList.remove("hidden"),a("clearResultsBtn")?.classList.remove("hidden"),a("cancelBtn")?.classList.add("hidden"),Y(e.validationProgress,"validation"),(await ie()).length?a("retryFailedBtn")?.classList.remove("hidden"):a("retryFailedBtn")?.classList.add("hidden")),t==="review"&&e.reviewProgress&&!e.reviewComplete&&Y(e.reviewProgress,"review"),e.reviewComplete&&!se&&(L=e.reviewResults||[],pe(L),se=!0,U("review"),a("reviewBtn").disabled=!1,Y(e.reviewProgress,"review"),a("cancelReviewBtn")?.classList.add("hidden"),a("clearReviewResultsBtn")?.classList.remove("hidden")),t==="validation"&&e.validationError&&!e.validationProgress&&(a("cancelBtn")?.classList.add("hidden"),a("progressText").textContent=e.validationError),e.reviewError&&(a("reviewBtn").disabled=!1,a("cancelReviewBtn")?.classList.add("hidden"))},1e3)}function Y(e,t=O){if(!e||!e.total)return;let n=Math.round(e.completed/e.total*100),s=e.completedAt||Date.now(),r=e.startedAt||s,l=Math.max(0,s-r),o=e.completed>=e.total,i=!o&&e.completed>0?Ne(Math.max(0,l/e.completed*(e.total-e.completed))):o?"Complete":"Calculating",d=t==="review"?"Review":"Validation",c=e.current&&!String(e.current).toLowerCase().includes("completed")?` \u2022 Current: ${e.current}`:"";a("progressText").textContent=o?`${d} complete: ${e.completed}/${e.total} processed \u2022 Time Elapsed: ${Ne(l)} \u2022 Estimated Time: Complete`:`${d} in progress: ${e.completed}/${e.total} processed${c} \u2022 Time Elapsed: ${Ne(l)} \u2022 Estimated Time: ${i}`,a("progressFill").style.width=`${n}%`}function Ne(e){let t=Math.max(0,Math.round(e/1e3));if(t<60)return`${t}s`;let n=Math.floor(t/60),s=t%60;return`${n}m ${s}s`}function U(e){O=e==="review"?"review":"validation",a("validationTabBtn")?.classList.toggle("active",O==="validation"),a("reviewTabBtn")?.classList.toggle("active",O==="review"),a("resultsContainer")?.classList.toggle("hidden",O!=="validation"),a("reviewResultsContainer")?.classList.toggle("hidden",O!=="review"),q()}function q(){let e=E&&E.length>0,t=L&&L.length>0;a("exportBtn")?.classList.toggle("hidden",O!=="validation"||!e),a("clearResultsBtn")?.classList.toggle("hidden",O!=="validation"||!e),a("clearReviewResultsBtn")?.classList.toggle("hidden",O!=="review"||!t)}function Ie(e){let t=a("validationCardsContainer");if(t.innerHTML="",!e||e.length===0){q();return}e.forEach(n=>{let s=document.createElement("div");s.className="result-card";let r=n.results&&n.results.some(i=>i.reason==="Question identifier was not found in the survey questions."),l=n.summary?n.summary.score:null,o=l!==null&&l<90;s.innerHTML=`

                <div class="result-header">

                    <strong>

                        ${n.assetName}

                    </strong>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${r?'<span class="score-error-indicator" title="Question identifier was not found in the survey questions.">! Error</span>':""}
                        <span class="score-pill ${o?"score-low":""}">
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

                        ${n.results.map(i=>`

                            <div${i.reason==="Question identifier was not found in the survey questions."?' class="rule-error-missing"':""}>

                                <strong>
                                    ${i.id}
                                </strong>

                                :

                                ${i.status}

                                <br>

                                <small>
                                    ${i.reason}
                                </small>

                            </div>

                            <hr>
                        `).join("")}

                    </div>

                </details>
                    `}
            `,t.appendChild(s)}),document.querySelectorAll(".download-context").forEach(n=>{n.addEventListener("click",()=>{Fn(n.dataset.id)})}),q()}function pe(e){let t=a("reviewCardsContainer");if(t.innerHTML="",!e||e.length===0){t.innerHTML='<div class="review-empty">No review results yet.</div>',q();return}e.forEach(n=>{let s=document.createElement("div"),r=n.status==="Incomplete"?"status-incomplete":"status-completed";s.className=`review-card ${r}`;let l=n.status==="Incomplete"?`
                        <div><strong>Incomplete Initiated On:</strong> ${n.incompleteInitiatedOnFormatted||"N/A"}</div>
                        <div><strong>Due On:</strong> ${n.dueOnFormatted||"N/A"}</div>
                    `:`
                        <div><strong>Due On:</strong> ${n.dueOnFormatted||"N/A"}</div>
                    `;s.innerHTML=`
                <div class="review-card-header">
                    <div class="review-card-title">
                        ${n.assetName||"Unknown Assessment"}
                        <span>Assessment ID: ${n.assessmentId||"N/A"}</span>
                    </div>
                    <span class="status-pill ${r}">
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
                    </div>`}
            `,t.appendChild(s)}),document.querySelectorAll(".review-notes-btn").forEach(n=>{n.addEventListener("click",()=>hn(n.dataset.id))}),q()}async function vn(){if(!u||u.error)return;let e=nt(u);e.length!==0&&await He({...u,workQueue:e})}function hn(e){let t=L.find(n=>String(n.assessmentId)===String(e));!t||t.error||(u=t,a("reviewNotesTitle").textContent=t.assetName||"Review Notes",a("reviewNotesMeta").innerHTML=t.notesMetaHtml||"",Sn(t),Oe(),a("reviewNotesModal")?.classList.remove("hidden"))}function Ce(){a("reviewNotesModal")?.classList.add("hidden"),u=null}async function gn(){W=(await chrome.storage.local.get("reviewQuestionNotes")).reviewQuestionNotes||{}}async function yn(){await chrome.storage.local.set({reviewQuestionNotes:W})}function Sn(e){let t=V(e);_[t]||(_[t]=(e.workQueue||[]).map((n,s)=>Z(n,s)))}function Oe(){let e=a("reviewNotesContent");if(!e||!u)return;let t=u.workQueue||[];if(t.length===0){e.innerHTML='<div class="review-output-empty">No reachable unanswered work queue items were found.</div>',Le();return}let n=V(u),s=new Set(_[n]||[]);e.innerHTML=t.map((r,l)=>An(r,l,s.has(Z(r,l)))).join(""),En(),Le()}function An(e,t,n){let s=Z(e,t),r=st(u,e,t),l=(e.options||[]).length?(e.options||[]).map(o=>`<li>${y(Cn(o))}</li>`).join(""):"<li>&lt;no options&gt;</li>";return`
        <section class="review-output-item" data-question-key="${y(s)}">
            <div class="review-question-toolbar">
                <label class="review-question-select">
                    <input
                        type="checkbox"
                        class="review-question-checkbox"
                        data-key="${y(s)}"
                        ${n?"checked":""}
                    >
                    <span>Select for download</span>
                </label>
                <button
                    type="button"
                    class="review-note-icon-btn"
                    data-key="${y(s)}"
                    title="ASA Notes"
                    aria-label="ASA Notes"
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                    </svg>
                </button>
            </div>
            ${e.status?`<div class="review-output-status">${y(e.status)}</div>`:""}
            <div class="review-output-id-row">
                <div><strong>Category:</strong> <span>${y(e.questionGroup||"N/A")}</span></div>
                <div><strong>Question ID:</strong> <span>${y(e.questionId||"N/A")}</span></div>
            </div>
            <div class="review-output-field">
                <strong>Question:</strong>
                <span>${y(e.question||"N/A")}</span>
            </div>
            <div class="review-output-field">
                <strong>Answer Type:</strong>
                <span>${y(e.answerType||"N/A")}</span>
            </div>
            <div class="review-output-field">
                <strong>Options:</strong>
                <ul>${l}</ul>
            </div>
            <div class="review-asa-note ${r?"":"hidden"}" data-note-preview="${y(s)}">
                <strong>ASA Notes:</strong>
                <span>${y(r)}</span>
            </div>
            <div class="review-note-editor hidden" data-note-editor="${y(s)}">
                <textarea
                    class="review-note-input"
                    data-note-input="${y(s)}"
                    placeholder="Write ASA notes for this question..."
                >${y(r)}</textarea>
                <button
                    type="button"
                    class="btn-secondary review-note-save-btn"
                    data-key="${y(s)}"
                >
                    Save Notes
                </button>
            </div>
        </section>
    `}function En(){document.querySelectorAll(".review-question-checkbox").forEach(e=>{e.addEventListener("change",()=>{bn(e.dataset.key,e.checked),Le()})}),document.querySelectorAll(".review-note-icon-btn").forEach(e=>{e.addEventListener("click",()=>Nn(e.dataset.key))}),document.querySelectorAll(".review-note-save-btn").forEach(e=>{e.addEventListener("click",()=>xn(e.dataset.key))})}function bn(e,t){let n=V(u),s=new Set(_[n]||[]);t?s.add(e):s.delete(e),_[n]=[...s]}function Tn(){if(!u)return;let e=V(u),t=(u.workQueue||[]).map((s,r)=>Z(s,r)),n=_[e]||[];_[e]=n.length===t.length?[]:t,Oe()}function Le(){let e=a("downloadReviewNotesBtn"),t=a("selectAllReviewNotesBtn");if(!e||!u)return;let n=(u.workQueue||[]).length,s=nt(u).length;e.textContent=`Download Review Notes (${s}/${n})`,e.disabled=s===0,t&&(t.textContent=s===n&&n>0?"Deselect All":"Select All",t.disabled=n===0)}function nt(e){let t=V(e),n=new Set(_[t]||[]);return(e.workQueue||[]).map((s,r)=>({item:s,index:r,key:Z(s,r)})).filter(s=>n.has(s.key)).map(s=>({...s.item,asaNotes:st(e,s.item,s.index)}))}function Nn(e){document.querySelector(`[data-note-editor="${at(e)}"]`)?.classList.toggle("hidden")}async function xn(e){let n=document.querySelector(`[data-note-input="${at(e)}"]`)?.value.trim()||"",s=V(u);W[s]||(W[s]={}),W[s][e]=n,await yn(),Oe()}function st(e,t,n){let s=V(e),r=Z(t,n);return W[s]?.[r]||""}function V(e){return String(e?.assessmentId||"active")}function Z(e,t){return String(e?.surveyTemplateQuestionId||e?.questionId||`question-${t}`)}function Cn(e){return e.internalValue||e.displayValue||"<no options>"}function y(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function at(e){return window.CSS?.escape?CSS.escape(e):String(e).replace(/\\/g,"\\\\").replace(/"/g,'\\"')}async function Ln(){if(!u)return;let t=`<!doctype html><html><head><meta charset="utf-8"></head><body>${u.reviewOutputCopyHtml||u.reviewOutputHtml||u.notesHtml||""}</body></html>`,n=u.reviewOutputText||u.notesText||a("reviewNotesContent")?.innerText||"",s=u.reviewOutputRtf||"";try{if(navigator.clipboard?.write&&window.ClipboardItem){let r={"text/html":new Blob([t],{type:"text/html"}),"text/plain":new Blob([n],{type:"text/plain"})};s&&(r["text/rtf"]=new Blob([s],{type:"text/rtf"}));try{await navigator.clipboard.write([new ClipboardItem(r)])}catch{await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([t],{type:"text/html"}),"text/plain":new Blob([n],{type:"text/plain"})})])}}else await navigator.clipboard.writeText(n);a("copyReviewNotesBtn").textContent="Copied",setTimeout(()=>{a("copyReviewNotesBtn").textContent="Copy Review Output"},1200)}catch{await navigator.clipboard.writeText(n)}}function Rn(){let e=new Map(ke.map(t=>[t.id,t.openUrl||t.url]));document.querySelectorAll(".prereq-open-link").forEach(t=>{let n=e.get(t.dataset.site);n&&(t.href=n,t.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),chrome.tabs.create({url:n})}))})}async function In(){let e=await chrome.storage.local.get("prerequisiteStatus");e.prerequisiteStatus&&ot(e.prerequisiteStatus)}async function rt(){On();try{let e=await chrome.runtime.sendMessage({action:"CHECK_PREREQUISITES"});e?.success&&e.prerequisites&&ot(e.prerequisites)}catch(e){a("prereqSummary").textContent=`Unable to check sessions: ${e.message}`,document.querySelectorAll(".prereq-item .signal").forEach(t=>{t.className="signal signal-fail"})}}function On(){a("prereqSummary").textContent="Checking Cairo, ESATS, and GTC sessions...",document.querySelectorAll(".prereq-item").forEach(e=>{let t=e.querySelector(".signal"),n=e.querySelector("small");t.className="signal signal-checking",n&&(n.textContent="Checking..."),e.title="Checking session..."})}function ot(e){let t=e.checks||[];t.forEach(s=>{let r=document.querySelector(`.prereq-item[data-site="${s.id}"]`);if(!r)return;let l=r.querySelector(".signal"),o=r.querySelector("small");l.className=`signal ${s.passed?"signal-pass":"signal-fail"}`,o&&(o.textContent=s.passed?"Active":"Needs sign-in"),r.title=`${s.message}. Final URL: ${s.finalUrl}`});let n=t.filter(s=>!s.passed);if(n.length===0&&t.length>0){a("prereqSummary").textContent="All prerequisite sessions are active.";return}if(t.length===0){a("prereqSummary").textContent="Session checks have not run yet.";return}a("prereqSummary").textContent=`${n.length} session check${n.length===1?"":"s"} need attention. Open the help tooltip for sign-in steps.`}async function $n(){E=await Me(),L=await Fe(),E&&E.length&&(Ie(E),z=!0,a("exportBtn")?.classList.remove("hidden"),a("clearResultsBtn")?.classList.remove("hidden")),L&&L.length?(pe(L),se=!0):pe([]);let e=await chrome.storage.local.get(b.STORAGE_KEYS.LAST_ACTION);U(e[b.STORAGE_KEYS.LAST_ACTION]==="review"?"review":"validation"),(await ie()).length&&a("retryFailedBtn")?.classList.remove("hidden")}async function kn(){await chrome.runtime.sendMessage({action:"CLEAR_RESULTS"}),E=[],Ie(E),z=!1,a("retryFailedBtn")?.classList.add("hidden"),a("cancelBtn")?.classList.add("hidden"),a("progressContainer")?.classList.add("hidden"),a("progressFill").style.width="0%",a("progressText").textContent="Starting...",q()}async function Dn(){await chrome.runtime.sendMessage({action:"CLEAR_REVIEW_RESULTS"}),L=[],pe(L),se=!1,a("reviewBtn").disabled=!1,a("cancelReviewBtn")?.classList.add("hidden"),Ce(),q()}async function Mn(){let e=await ie();e.length!==0&&(z=!1,a("progressContainer")?.classList.remove("hidden"),Y({completed:0,total:e.length,current:"Starting validation",startedAt:Date.now()}),a("cancelBtn")?.classList.remove("hidden"),a("retryFailedBtn")?.classList.add("hidden"),await chrome.runtime.sendMessage({action:"START_VALIDATION",assessments:e}))}async function Fn(e){let n=(await Be())[e];if(!n)return;let s=new Blob([JSON.stringify(n,null,2)],{type:"application/json"}),r=URL.createObjectURL(s),l=document.createElement("a");l.href=r,l.download=`context_${e}.json`,l.click(),URL.revokeObjectURL(r)}async function Bn(){!E||E.length===0||await qe(E)}async function _n(){let e=a("whatsNewIcon"),t=a("surveyDiffModal"),n=a("closeModalBtn"),s=a("refreshDiffBtn"),r=a("surveyFromSearch"),l=a("surveyToSearch"),o=a("runSurveyDiffBtn");!e||!t||!n||(e.addEventListener("click",async()=>{t.classList.remove("hidden");try{await Un()}catch(i){console.error("Survey diff modal restore error:",i),$e(),F(null,"Unable to load survey versions.")}}),n.addEventListener("click",()=>{t.classList.add("hidden")}),t.addEventListener("click",i=>{i.target===t&&t.classList.add("hidden")}),s&&s.addEventListener("click",qn),r?.addEventListener("focus",()=>{M("from"),a("surveyFromOptions")?.classList.remove("hidden")}),r?.addEventListener("input",()=>{f=null,v=null,l&&(l.value="",l.disabled=!0,l.placeholder="Select From first"),re(),ae(),Q({selectedFromId:null,selectedToId:null,diff:null}),M("from"),a("surveyFromOptions")?.classList.remove("hidden")}),l?.addEventListener("focus",()=>{f&&(M("to"),a("surveyToOptions")?.classList.remove("hidden"))}),l?.addEventListener("input",()=>{v=null,re(),ae(),Q({selectedFromId:f?.surveyTemplateId||null,selectedToId:null,diff:null}),M("to"),a("surveyToOptions")?.classList.remove("hidden")}),o?.addEventListener("click",Hn),document.addEventListener("click",i=>{i.target.closest(".survey-combobox")||(a("surveyFromOptions")?.classList.add("hidden"),a("surveyToOptions")?.classList.add("hidden"))}))}async function fe(){return(await chrome.storage.local.get(b.STORAGE_KEYS.WHATS_NEW_MODAL))[b.STORAGE_KEYS.WHATS_NEW_MODAL]||{}}async function Q(e){let t=await fe();await chrome.storage.local.set({[b.STORAGE_KEYS.WHATS_NEW_MODAL]:{...t,...e,updatedAt:Date.now()}})}function Xe(e){return C.find(t=>Number(t.surveyTemplateId)===Number(e))||null}function Pn(){let e=a("surveyFromSearch"),t=a("surveyToSearch");e&&(e.value=f?X(f):""),t&&(t.value=v?X(v):"",t.disabled=!f,t.placeholder=f?"Search newer versions...":"Select From first"),re()}async function Un(){let e=await fe();Array.isArray(e.templates)&&e.templates.length>0&&(C=Re(e.templates)),C.length===0&&($e(),F(null,"Loading survey versions..."),await it()),f=e.selectedFromId?Xe(e.selectedFromId):null,v=e.selectedToId?Xe(e.selectedToId):null,f&&v&&v.versionNumber<=f.versionNumber&&(v=null),Pn(),M("from"),e.diff&&f&&v?F(e.diff):F(null,"Select a From and To version, then click What's New.")}async function qn(){let e=a("refreshDiffBtn");if(!(!e||e.disabled)){e.disabled=!0,e.setAttribute("aria-busy","true"),ne+=1;try{$e(),ae(),await Q({selectedFromId:null,selectedToId:null,diff:null,templates:[]}),await it(!0)}catch(t){console.error("Survey template refresh error:",t),F(null,"Unable to load survey versions.")}finally{e.disabled=!1,e.removeAttribute("aria-busy")}}}function Re(e){return(Array.isArray(e)?e:Object.values(e||{})).filter(n=>n&&n.surveyTemplateId&&n.versionNumber!==void 0&&n.versionNumber!==null).map(n=>({...n,surveyTemplateId:Number(n.surveyTemplateId),versionNumber:Number(n.versionNumber)})).filter(n=>!Number.isNaN(n.surveyTemplateId)&&!Number.isNaN(n.versionNumber)).sort((n,s)=>s.versionNumber-n.versionNumber)}async function it(e=!1){if(C.length>0&&!e){M("from");return}if(!e){let n=await fe();if(Array.isArray(n.templates)&&n.templates.length>0){C=Re(n.templates),M("from");return}}e&&(C=[]);let t=a("surveyFromSearch");t&&(t.placeholder="Loading versions...",t.disabled=!0);try{C=Re(await Ye()),await Q({templates:C}),t&&(t.disabled=!1,t.placeholder="Search versions..."),M("from")}catch(n){throw console.error("Survey template load error:",n),t&&(t.disabled=!1,t.placeholder="Unable to load versions"),n}}function $e(){f=null,v=null;let e=a("surveyFromSearch"),t=a("surveyToSearch");e&&(e.value="",e.disabled=!1,e.placeholder="Search versions..."),t&&(t.value="",t.disabled=!0,t.placeholder="Select From first"),a("surveyFromOptions")?.classList.add("hidden"),a("surveyToOptions")?.classList.add("hidden"),a("surveyFromOptions")&&(a("surveyFromOptions").innerHTML=""),a("surveyToOptions")&&(a("surveyToOptions").innerHTML=""),re()}function ae(){let e=a("diffDateRange"),t=a("diffContent");e&&(e.textContent="",e.classList.add("hidden")),t&&(t.innerHTML="")}function X(e){let t=e.releasedOn?B(e.releasedOn):"-",n=e.deactivatedOn?B(e.deactivatedOn):"-";return`Version-${e.versionNumber} (Released on: ${t}, Deactivated on: ${n})`}function Qn(e){return e==="to"?f?C.filter(t=>t.versionNumber>f.versionNumber):[]:C}function M(e){let t=a(e==="from"?"surveyFromSearch":"surveyToSearch"),n=a(e==="from"?"surveyFromOptions":"surveyToOptions");if(!t||!n)return;let s=t.value.trim().toLowerCase(),r=Qn(e).filter(l=>X(l).toLowerCase().includes(s));if(n.innerHTML="",r.length===0){let l=document.createElement("div");l.className="survey-option-empty",l.textContent=C.length===0?"No survey versions found.":"No matching versions.",n.appendChild(l);return}r.forEach(l=>{let o=document.createElement("button");o.type="button",o.className="survey-option",o.value=String(l.surveyTemplateId),o.textContent=X(l),o.addEventListener("click",()=>{Vn(e,l)}),n.appendChild(o)})}function Vn(e,t){if(e==="from"){f=t,v=null;let n=a("surveyFromSearch"),s=a("surveyToSearch");n&&(n.value=X(t)),s&&(s.value="",s.disabled=!1,s.placeholder="Search newer versions..."),a("surveyFromOptions")?.classList.add("hidden"),M("to"),ae(),Q({selectedFromId:t.surveyTemplateId,selectedToId:null,diff:null})}else{v=t;let n=a("surveyToSearch");n&&(n.value=X(t)),a("surveyToOptions")?.classList.add("hidden"),ae(),Q({selectedFromId:f?.surveyTemplateId||null,selectedToId:t.surveyTemplateId,diff:null})}re()}function re(){let e=a("runSurveyDiffBtn");e&&e.classList.toggle("hidden",!f||!v)}async function Hn(){if(!f||!v)return;let e=a("runSurveyDiffBtn"),t=ne+1;ne=t,e&&(e.disabled=!0,e.textContent="Loading...");try{let n=await fe();if(n.diff&&Number(n.selectedFromId)===Number(f.surveyTemplateId)&&Number(n.selectedToId)===Number(v.surveyTemplateId)){F(n.diff);return}F(null,"Loading changes...");let s=await Je(f.surveyTemplateId,v.surveyTemplateId);t===ne&&(F(s),await Q({selectedFromId:f.surveyTemplateId,selectedToId:v.surveyTemplateId,diff:s}))}catch(n){console.error("Survey diff error:",n),t===ne&&F(null,"Unable to load survey differences.")}finally{e&&(e.disabled=!1,e.textContent="What's New")}}function F(e,t="No changes detected between the selected survey templates."){let n=a("diffDateRange"),s=a("diffContent");if(!n||!s)return;if(s.innerHTML="",!e||e.newQuestions.length===0&&e.removedQuestions.length===0&&e.modifiedQuestions.length===0){n.classList.add("hidden");let o=document.createElement("div");o.className="diff-empty",o.textContent=t,s.appendChild(o);return}let r=e.metadata.fromReleasedOn||e.metadata.fromUpdatedOn?B(e.metadata.fromReleasedOn||e.metadata.fromUpdatedOn):"Unknown",l=e.metadata.toReleasedOn||e.metadata.toUpdatedOn?B(e.metadata.toReleasedOn||e.metadata.toUpdatedOn):"Unknown";n.textContent=`From V-${e.metadata.fromVersionNumber||e.metadata.fromId} (${r}) to V-${e.metadata.toVersionNumber||e.metadata.toId} (${l})`,n.classList.remove("hidden"),e.newQuestions.forEach(o=>{let i=document.createElement("div");i.className="diff-item",i.innerHTML=`
            <h4><span class="diff-tag new">New Question</span> <span class="diff-id">[${o.alternateQuestionId}]</span></h4>
            <div class="diff-detail"><strong>Context:</strong> ${o.questionText||"\u2014"}</div>
        `,s.appendChild(i)}),e.removedQuestions.forEach(o=>{let i=document.createElement("div");i.className="diff-item",i.innerHTML=`
            <h4><span class="diff-tag removed">Removed Question</span> <span class="diff-id">[${o.alternateQuestionId}]</span></h4>
            <div class="diff-detail"><strong>Context:</strong> ${o.questionText||"\u2014"}</div>
        `,s.appendChild(i)}),e.modifiedQuestions.forEach(o=>{let i=document.createElement("div");i.className="diff-item";let d="",c="";o.textChanged&&(d+='<span class="diff-tag changed">Question Changed</span>',c+=`
                <div class="diff-detail"><strong>Old:</strong> ${o.textChanged.old}</div>
                <div class="diff-detail"><strong>New:</strong> ${o.textChanged.new}</div>
            `),o.optionsChanged&&(d+='<span class="diff-tag changed">Options Changed</span>',o.optionsChanged.added?.length>0&&(c+=`<div class="diff-detail"><strong>Added Options:</strong> ${o.optionsChanged.added.join(", ")}</div>`),o.optionsChanged.removed?.length>0&&(c+=`<div class="diff-detail"><strong>Removed Options:</strong> ${o.optionsChanged.removed.join(", ")}</div>`)),i.innerHTML=`
            <h4>${d} <span class="diff-id">[${o.alternateQuestionId}]</span></h4>
            ${c}
        `,s.appendChild(i)})}
