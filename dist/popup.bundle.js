var E={VERSION:"1.0.0",MAX_CONCURRENT_VALIDATIONS:5,STORAGE_KEYS:{SETTINGS:"settings",ASSESSMENTS:"assessments",SELECTED_ASSESSMENTS:"selectedAssessments",CONTEXTS:"contexts",VALIDATIONS:"validations",REVIEWS:"reviews",LAST_RUN:"lastRun",LAST_ACTION:"lastAction",DEBUG:"debug",WHATS_NEW_MODAL:"whatsNewModalState"}},Z={PRIMARY_ASSESSMENTS:"https://cairois.web.boeing.com/api/asset/4/82/assessment/type/35",ASSESSMENT_DETAIL:"https://cairois.web.boeing.com/api/assessment/{id}/detail",ASSESSMENT_ANSWERS:"https://cairois.web.boeing.com/api/assessment/survey/{id}/answers",ASSESSMENT_CONTACTS:"https://cairois.web.boeing.com/api/assessment/{id}/contacts",SURVEY_TEMPLATE_QUESTIONS:"https://cairois.web.boeing.com/api/survey/template/{id}/questions",SURVEY_TEMPLATE_DETAIL:"https://cairois.web.boeing.com/api/surveyTemplate/{id}",SURVEY_TEMPLATES_RP_APP:"https://cairois.web.boeing.com/api/surveyTemplate?where=alternateSurveyTemplateId:=:rp-app",REVIEW_SUMMARY:"https://cairois.web.boeing.com/api/asset/4/{assetId}/assessment/review/summaries?assessmentTypeId=35&reviewTypeId=6",ESATS_VERSIONS:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationVersion/GetBusinessApplicationVersions?esatsId={assetId}",ESATS_ARTIFACTS:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationVersionDocument/GetBusinessApplicationVersionPolicyAndArtifacts?esatsId={versionEsatsId}",GTC_LOOKUP:"https://termbank.web.boeing.com/ses/v1.2/GlobalTradeControlVocabularies/name/{name}.json"},Re=[{id:"cairo",name:"Cairo",url:Z.PRIMARY_ASSESSMENTS,openUrl:"https://cairois.web.boeing.com/",expectedHosts:["cairois.web.boeing.com"]},{id:"esats",name:"ESATS",url:"https://service-gateway.tas-phx.apps.boeing.com/",openUrl:"https://esats.web.boeing.com/",expectedHosts:["service-gateway.tas-phx.apps.boeing.com","esats.web.boeing.com"]},{id:"gtc",name:"GTC",url:"https://termbank.web.boeing.com/",openUrl:"https://gtc-ecm.web.boeing.com/",expectedHosts:["termbank.web.boeing.com","gtc-ecm.web.boeing.com"]}];async function me(e){return(await chrome.storage.local.get(e))[e]}async function Le(){return await me(E.STORAGE_KEYS.ASSESSMENTS)||[]}async function Ie(){return await me(E.STORAGE_KEYS.VALIDATIONS)||[]}async function Oe(){return await me(E.STORAGE_KEYS.REVIEWS)||[]}async function re(){return(await chrome.storage.local.get("failedAssessments")).failedAssessments||[]}async function $e(){return(await chrome.storage.local.get("assessmentContexts")).assessmentContexts||{}}function De(e,t){let n=[...e];if(t.search&&t.search.trim())if(t.regexMode)try{let s=new RegExp(t.search,"i");n=n.filter(o=>s.test(o.assetName||""))}catch{return[]}else{let s=t.search.toLowerCase();n=n.filter(o=>(o.assetName||"").toLowerCase().includes(s))}return t.fromDate&&(n=n.filter(s=>{let o=ke(s,t.dateFilterField);return!!o&&o>=t.fromDate})),t.toDate&&(n=n.filter(s=>{let o=ke(s,t.dateFilterField);return!!o&&o<=t.toDate})),t.assessmentStatus&&(n=n.filter(s=>{let o=ie(s);return!(t.assessmentStatus==="incomplete"&&!o||t.assessmentStatus==="completed"&&o)})),n}function ie(e){return!!(e.incompleteAssessmentId||e.hasIncomplete)}function nt(e,t){return t==="dueOn"?e.dueOn||e.raw?.dueOn:e.surveyCompletedOn||e.raw?.surveyCompletedOn}function ke(e,t){let n=nt(e,t);if(!n)return"";let o=String(n).match(/^\d{4}-\d{2}-\d{2}/);if(o)return o[0];let l=new Date(n);return Number.isNaN(l.getTime())?"":[l.getFullYear(),String(l.getMonth()+1).padStart(2,"0"),String(l.getDate()).padStart(2,"0")].join("-")}function Fe(e){return e.map(t=>t.assessmentId)}var st=chrome.runtime.getURL("assets/encoded_data.txt");async function Me(e){let t=Array.isArray(e)?e:[],n=await at(),s=n.worksheets[0],o=n.addWorksheet("All Assessments"),l=new Map;for(let i=0;i<t.length;i++){let d=t[i],c=Be(d),N=dt(c,i);l.set(c.assessmentId,N);let w=lt(n,s,N);rt(w,d,c)}ot(o,t,l),n.removeWorksheet(s.id),n.calcProperties.fullCalcOnLoad=!0,n.calcProperties.calcMode="auto";let r=await n.xlsx.writeBuffer();mt(r,`Risk_Profiler_Quality_List_${ut()}.xlsx`)}async function at(){let t=(await(await fetch(st)).text()).trim(),n=Uint8Array.from(atob(t),o=>o.charCodeAt(0)),s=new ExcelJS.Workbook;return await s.xlsx.load(n.buffer),s}function ot(e,t,n){e.columns=[{header:"Open",key:"open",width:15},{header:"Assessment ID",key:"assessmentId",width:18},{header:"Application",key:"application",width:40},{header:"Asset ID",key:"assetId",width:15},{header:"Lifecycle",key:"lifecycle",width:20},{header:"Application Manager",key:"manager",width:30},{header:"Business System Owner",key:"owner",width:30},{header:"Survey Completed Date",key:"surveyCompletedDate",width:22},{header:"Attested Date",key:"attestedDate",width:22},{header:"Status",key:"status",width:15},{header:"Attested By",key:"attestedBy",width:30},{header:"Passed",key:"passed",width:12},{header:"Failed",key:"failed",width:12},{header:"N/A",key:"na",width:12},{header:"Score",key:"score",width:12},{header:"Error",key:"error",width:60}],t.forEach(s=>{let o=Be(s),l=s.summary||{},r=(s.results||[]).filter(h=>h.status==="FAIL").map(h=>`${h.id}: ${h.reason}`),i=(s.results||[]).filter(h=>h.reason==="Question identifier was not found in the survey questions.").map(h=>h.id),d=[s.error,i.length?`Missing Questions: ${i.join(", ")}`:"",r.length?r.join(" | "):""].filter(Boolean).join(" | "),c=e.addRow({open:"Open",assessmentId:o.assessmentId,application:o.assetName,assetId:o.assetId,lifecycle:o.lifeCycle,manager:o.appMgrName,owner:o.sysOwnerName,surveyCompletedDate:pe(o.surveyCompletedOn),attestedDate:pe(o.attestOn),status:o.hasIncomplete?"Incomplete":"Completed",attestedBy:o.attestName||"",passed:l.passed||0,failed:l.failed||0,na:l.na||0,score:l.score?`${l.score}%`:"",error:d}),N=n.get(o.assessmentId),w=c.getCell(1);w.value={text:"Open",hyperlink:`#'${N}'!A1`},w.font={color:{argb:"FF0563C1"},underline:!0}}),e.getRow(1).font={bold:!0}}function rt(e,t,n){e.getCell("C2").value=n.assetName||"",e.getCell("C3").value=n.assetId||"",e.getCell("C4").value=n.appMgrName||"",e.getCell("C5").value=pe(new Date);let s=it(e);(t.results||[]).forEach(o=>{let l=s[String(o.id).toUpperCase()];if(!l)return;let r=e.getCell(`A${l}`);r.value=ct(o.status);let i=String(o.status||"").toUpperCase();i==="PASS"?(r.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF00A300"}},r.font={color:{argb:"ff000000"},bold:!0}):i==="FAIL"?(r.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFF0000"}},r.font={color:{argb:"ff000000"},bold:!0}):i==="NA"&&(r.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFD9D9D9"}},r.font={color:{argb:"ff000000"},italic:!0}),e.getCell(`D${l}`).value=o.reason||""})}function it(e){let t={};return e.eachRow((n,s)=>{let o=String(n.getCell(2).value||"").trim().toUpperCase();/^RP\d+$/.test(o)&&(t[o]=s)}),t}function lt(e,t,n){let s=e.addWorksheet(n);return t.properties&&(s.properties=JSON.parse(JSON.stringify(t.properties))),t.pageSetup&&(s.pageSetup=JSON.parse(JSON.stringify(t.pageSetup))),t.views&&(s.views=JSON.parse(JSON.stringify(t.views))),t.columns.forEach((o,l)=>{let r=s.getColumn(l+1);r.width=o.width,r.hidden=o.hidden,r.outlineLevel=o.outlineLevel}),t.eachRow({includeEmpty:!0},(o,l)=>{let r=s.getRow(l);r.height=o.height,r.hidden=o.hidden,r.outlineLevel=o.outlineLevel,o.eachCell({includeEmpty:!0},(i,d)=>{let c=r.getCell(d);if(typeof i.value=="object"&&i.value!==null)try{c.value=JSON.parse(JSON.stringify(i.value))}catch{c.value=i.text||""}else c.value=i.value;try{c.style=JSON.parse(JSON.stringify(i.style||{}))}catch{c.style={}}if(i.alignment)try{c.alignment=JSON.parse(JSON.stringify(i.alignment))}catch{}if(i.font)try{c.font=JSON.parse(JSON.stringify(i.font))}catch{}if(i.border)try{c.border=JSON.parse(JSON.stringify(i.border))}catch{}if(i.fill)try{c.fill=JSON.parse(JSON.stringify(i.fill))}catch{}if(i.numFmt&&(c.numFmt=i.numFmt),i.protection)try{c.protection=JSON.parse(JSON.stringify(i.protection))}catch{}})}),t.model?.merges&&t.model.merges.forEach(o=>{try{s.mergeCells(o)}catch{}}),s}function ct(e){switch(String(e||"").toUpperCase()){case"PASS":return"Yes";case"FAIL":return"No";case"NA":return"N/A";default:return""}}function Be(e){return{...e.assessment||{},assessmentId:e.assessmentId,assetName:e.assetName,...e.assessment||{}}}function dt(e,t){return(e.assetName||`Assessment ${t+1}`).replace(/[\\/?*[\]:]/g," ").trim().slice(0,31)}function pe(e){if(!e)return"";try{return new Date(e).toLocaleDateString()}catch{return e}}function ut(){let e=new Date,t=n=>String(n).padStart(2,"0");return`${e.getFullYear()}${t(e.getMonth()+1)}${t(e.getDate())}_${t(e.getHours())}${t(e.getMinutes())}${t(e.getSeconds())}`}function mt(e,t){let n=new Blob([e],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),s=URL.createObjectURL(n),o=document.createElement("a");o.href=s,o.download=t,o.click(),setTimeout(()=>URL.revokeObjectURL(s),1e3)}var ve="http://schemas.openxmlformats.org/wordprocessingml/2006/main",pt="http://schemas.microsoft.com/office/word/2010/wordml",ft="http://schemas.openxmlformats.org/markup-compatibility/2006",wt=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`,vt=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,ht=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,gt=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${ve}">
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
</w:styles>`,yt=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${ve}">
    <w:updateFields w:val="true"/>
</w:settings>`,_e=new TextEncoder,St=Ot();async function Ue(e){let t=new Blob([bt(e)],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),n=URL.createObjectURL(t),s=document.createElement("a");s.href=n,s.download=`${Ft(e?.assetName||"application")}_RISK-PRofiler_review_notes.docx`,s.click(),URL.revokeObjectURL(n)}function bt(e){return It([{name:"[Content_Types].xml",content:wt},{name:"_rels/.rels",content:vt},{name:"word/document.xml",content:At(e)},{name:"word/_rels/document.xml.rels",content:ht},{name:"word/styles.xml",content:gt},{name:"word/settings.xml",content:yt}])}function At(e){let t=e?.contacts||[],n=[T([g(`${e?.assetName||"Application"} Risk Profiler Review Notes`,{bold:!0})],{style:"Title",spacingAfter:260}),T([g("Application Details",{bold:!0})],{style:"Heading1"}),Tt([["Application Name",e?.assetName||"N/A"],["Due Date",Pe(e?.dueOn)||"N/A"],["Survey Completed On",Pe(e?.surveyCompletedOn)||"N/A"],["Review Assessment Date",Dt(e?.reviewedAt)||"N/A"]]),T([g("Contacts",{bold:!0})],{style:"Heading1",spacingBefore:180}),Et(t),T([g("Review Output",{bold:!0})],{style:"Heading1",spacingBefore:220}),Nt(e?.workQueue||[])].join("");return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
    xmlns:w="${ve}"
    xmlns:w14="${pt}"
    xmlns:mc="${ft}"
    mc:Ignorable="w14">
    <w:body>
        ${n}
        <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
        </w:sectPr>
    </w:body>
</w:document>`}function Et(e){if(e.length===0)return T([g("No Responsible Manager or Primary Contact details were found.")]);let t=[le([I("Contact Type",{bold:!0,fill:"E8EEFC"}),I("Name",{bold:!0,fill:"E8EEFC"}),I("Identity ID",{bold:!0,fill:"E8EEFC"}),I("Email",{bold:!0,fill:"E8EEFC"})]),...e.map(n=>le([I(n.contactType||"N/A"),I(n.associatedTo||"N/A"),I(n.associatedToIdentityId||"N/A"),I(n.email||"N/A")]))];return he(t)}function Tt(e){return he(e.map(([t,n])=>le([I(t,{bold:!0,fill:"F3F4F6"}),I(n)])))}function Nt(e){return e.length===0?T([g("No reachable unanswered work queue items were found.")]):e.map((t,n)=>[t.status?T([g(t.status,{bold:!0,color:"315FD6"})],{spacingBefore:n===0?80:180,spacingAfter:80}):"",Ct(t.questionGroup||"N/A",t.questionId||"N/A"),fe("Question",t.question||"N/A"),fe("Answer Type",t.answerType||"N/A"),t.asaNotes?fe("ASA Notes",t.asaNotes):"",T([g("Options",{bold:!0})]),...xt(t.options||[]),Lt()].join("")).join("")}function xt(e){return(e.length?e:[{index:1,internalValue:"<no options>"}]).map(n=>T([Rt(),g(` ${n.index||""}. ${n.internalValue||n.displayValue||"<no options>"}`)],{indentLeft:360,spacingAfter:70}))}function Ct(e,t){return he([le([we([g("Category: ",{bold:!0}),g(e)]),we([g("Question ID: ",{bold:!0}),g(t)],{align:"right"})])],{noBorders:!0})}function fe(e,t){return T([g(`${e}: `,{bold:!0}),g(t)])}function Rt(){return`
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
        </w:sdt>`}function Lt(){return T([],{borderBottom:!0,spacingBefore:80,spacingAfter:140})}function T(e,t={}){let n=[];return t.style&&n.push(`<w:pStyle w:val="${Qe(t.style)}"/>`),t.align&&n.push(`<w:jc w:val="${t.align}"/>`),(t.spacingBefore||t.spacingAfter)&&n.push(`<w:spacing w:before="${t.spacingBefore||0}" w:after="${t.spacingAfter||0}"/>`),t.indentLeft&&n.push(`<w:ind w:left="${t.indentLeft}"/>`),t.borderBottom&&n.push('<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/></w:pBdr>'),`<w:p>${n.length?`<w:pPr>${n.join("")}</w:pPr>`:""}${e.join("")}</w:p>`}function g(e,t={}){let n=[];return t.bold&&n.push("<w:b/>"),t.color&&n.push(`<w:color w:val="${t.color}"/>`),`<w:r>${n.length?`<w:rPr>${n.join("")}</w:rPr>`:""}<w:t xml:space="preserve">${Qe(e)}</w:t></w:r>`}function he(e,t={}){return`<w:tbl>
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
    </w:tbl>`}function le(e){return`<w:tr>${e.join("")}</w:tr>`}function I(e,t={}){return we([g(e||"",{bold:t.bold})],t)}function we(e,t={}){let n=['<w:tcW w:w="2500" w:type="pct"/>','<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>'];return t.fill&&n.push(`<w:shd w:fill="${t.fill}"/>`),`<w:tc><w:tcPr>${n.join("")}</w:tcPr>${T(e,{align:t.align})}</w:tc>`}function It(e){let t=0,n=[],s=[];e.forEach(r=>{let i=_e.encode(r.name),d=_e.encode(r.content),c=$t(d);n.push(b(67324752),p(20),p(0),p(0),p(0),p(0),b(c),b(d.length),b(d.length),p(i.length),p(0),i,d),s.push(b(33639248),p(20),p(20),p(0),p(0),p(0),p(0),b(c),b(d.length),b(d.length),p(i.length),p(0),p(0),p(0),p(0),b(0),b(t),i),t+=30+i.length+d.length});let o=qe(s),l=[b(101010256),p(0),p(0),p(e.length),p(e.length),b(o),b(t),p(0)];return kt([...n,...s,...l])}function Ot(){let e=[];for(let t=0;t<256;t+=1){let n=t;for(let s=0;s<8;s+=1)n=n&1?3988292384^n>>>1:n>>>1;e[t]=n>>>0}return e}function $t(e){let t=4294967295;for(let n of e)t=St[(t^n)&255]^t>>>8;return(t^4294967295)>>>0}function p(e){let t=new Uint8Array(2);return new DataView(t.buffer).setUint16(0,e,!0),t}function b(e){let t=new Uint8Array(4);return new DataView(t.buffer).setUint32(0,e>>>0,!0),t}function kt(e){let t=qe(e),n=new Uint8Array(t),s=0;return e.forEach(o=>{n.set(o,s),s+=o.length}),n}function qe(e){return e.reduce((t,n)=>t+n.length,0)}function Qe(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function Pe(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"2-digit"})}function Dt(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleString(void 0,{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}function Ft(e){return String(e).trim().replace(/[\\/:*?"<>|]+/g,"_").replace(/\s+/g,"_").replace(/^_+|_+$/g,"")||"application"}function ge(e,t){let n=e;return Object.entries(t).forEach(([s,o])=>{n=n.replace(`{${s}}`,o)}),n}var ee=new Map,Mt="https://esats.web.boeing.com",Bt="service-gateway.tas-phx.apps.boeing.com",_t="https://gtc-ecm.web.boeing.com",Pt="termbank.web.boeing.com",Ut={retries:3,retryDelay:1e3,useCache:!0};function qt(e){return new Promise(t=>setTimeout(t,e))}function Qt(e){try{return new URL(e).hostname===Bt}catch{return!1}}function Vt(e){try{return new URL(e).hostname===Pt}catch{return!1}}function Ht(){return typeof chrome<"u"&&chrome.tabs&&chrome.scripting}function Gt(e){return new Promise(t=>{chrome.tabs.query(e,t)})}async function jt(e){let t=await Gt({url:`${e}/*`});return t.find(n=>n.id&&n.status==="complete")||t.find(n=>n.id)}function Kt(e){return new Promise((t,n)=>{chrome.scripting.executeScript(e,s=>{let o=chrome.runtime.lastError;if(o){n(new Error(o.message));return}t(s)})})}async function Ve(e,{pageOrigin:t,label:n,useBearerToken:s}){if(!Ht())throw new Error(`${n} requests require the Chrome scripting permission.`);let o=await jt(t);if(!o)throw new Error(`Open ${n} in this browser and sign in before running ${n} validation requests.`);let r=(await Kt({target:{tabId:o.id},world:"MAIN",args:[e,s,t],func:async(i,d,c)=>{function N(L){if(!L)return null;let S=String(L).trim();S.startsWith("Bearer ")&&(S=S.slice(7).trim());try{let m=JSON.parse(S);typeof m=="string"?S=m.trim():m&&typeof m=="object"&&(S=m.esatsToken||m.access_token||m.token||m.value||S)}catch{}return S||null}let w=d?N(localStorage.getItem("esatsToken")):null,h={Accept:"application/json, text/plain, */*"};d&&w&&(h.Authorization=`Bearer ${w}`);try{let m=null,H=null;for(let K=1;K<=3;K++){try{if(m=await fetch(i,{method:"GET",headers:h,credentials:"omit",cache:"no-store",referrer:`${c}/`,referrerPolicy:"strict-origin-when-cross-origin"}),m.ok)break;H=new Error(`${m.status} ${m.statusText}`)}catch(x){H=x}K<3&&await new Promise(x=>setTimeout(x,1e3))}if(!m||!m.ok)throw H||new Error("Request failed");let G=await m.text(),j=null;if(G)try{j=JSON.parse(G)}catch{j=G}return{ok:m.ok,status:m.status,statusText:m.statusText,url:m.url,hasAuthorization:d?!!w:!0,data:j}}catch(L){return console.log("ESATS token:",w),console.log("Request URL:",i),console.log("Headers:",h),{ok:!1,status:0,statusText:L.message||"Request failed",hasAuthorization:d?!!w:!0,error:L.message}}}}))?.[0]?.result;if(!r)throw new Error(`${n} request did not return a response.`);if(!r.ok){let i=r.hasAuthorization?"":" No ESATS bearer token was found in the ESATS tab.";throw new Error(`${n} request failed: ${r.status} ${r.statusText}.${i}`)}return r.data}async function Wt(e){return Ve(e,{pageOrigin:Mt,label:"ESATS",useBearerToken:!0})}async function Yt(e){return Ve(e,{pageOrigin:_t,label:"GTC",useBearerToken:!1})}async function ce(e,t={}){let n={...Ut,...t};if(n.useCache&&ee.has(e))return ee.get(e);let s;for(let o=1;o<=n.retries;o++)try{if(Qt(e)){let i=await Wt(e);return n.useCache&&ee.set(e,i),i}if(Vt(e)){let i=await Yt(e);return n.useCache&&ee.set(e,i),i}let l=await fetch(e,{credentials:"include",headers:{Accept:"application/json, text/plain, */*"},cache:"no-store"});if(!l.ok)throw new Error(`${l.status} ${l.statusText}`);let r=await l.json();return n.useCache&&ee.set(e,r),r}catch(l){s=l,o<n.retries&&await qt(n.retryDelay)}throw s}async function ye(e){if(!e)return[];let t=ge(Z.SURVEY_TEMPLATE_QUESTIONS,{id:e});return ce(t)}async function Se(e){if(!e)return null;let t=ge(Z.SURVEY_TEMPLATE_DETAIL,{id:e});return ce(t)}async function He(){return ce(Z.SURVEY_TEMPLATES_RP_APP,{useCache:!1})}function Ge(e){let t=new Map;for(let n of e)n.alternateQuestionId&&t.set(n.alternateQuestionId,n);return t}async function je(e,t){if(!e||!t)throw new Error("Both survey template IDs are required.");if(Number(e)===Number(t))return{metadata:{fromId:Number(e),toId:Number(t)},newQuestions:[],removedQuestions:[],modifiedQuestions:[]};let[n,s,o,l]=await Promise.all([Se(e),ye(e),Se(t),ye(t)]);if(!n||!o)throw new Error("Unable to load one or both survey template details.");let r=Ge(s||[]),i=Ge(l||[]),d=new Set([...r.keys(),...i.keys()]),c=Array.from(d).sort(),N={metadata:{fromId:Number(e),fromVersionNumber:n.versionNumber,fromUpdatedOn:n.updatedOn,fromReleasedOn:n.releasedOn,toId:Number(t),toVersionNumber:o.versionNumber,toUpdatedOn:o.updatedOn,toReleasedOn:o.releasedOn},newQuestions:[],removedQuestions:[],modifiedQuestions:[]};for(let w of c)if(!r.has(w))N.newQuestions.push({alternateQuestionId:w,questionText:i.get(w).questionText});else if(!i.has(w))N.removedQuestions.push({alternateQuestionId:w,questionText:r.get(w).questionText});else{let h=r.get(w),L=i.get(w),S=!1,m={alternateQuestionId:w};h.questionText!==L.questionText&&(m.textChanged={old:h.questionText,new:L.questionText},S=!0);let H=new Set((h.options||[]).map(x=>x.displayValue)),G=new Set((L.options||[]).map(x=>x.displayValue)),j=[...G].filter(x=>!H.has(x)),K=[...H].filter(x=>!G.has(x));(j.length>0||K.length>0)&&(m.optionsChanged={added:j,removed:K},S=!0),S&&N.modifiedQuestions.push(m)}return N}var P=[],_=[],$=[],A=[],R=[],J=!1,ne=!1,O="validation",u=null,M={},Y={},C=[],f=null,v=null,te=0,a=e=>document.getElementById(e);document.addEventListener("DOMContentLoaded",Jt);async function Jt(){await We(),await un(),Xt(),await En(),Ze(),ln(),Nn(),On()}async function We(){P=await Le(),_=[...P],zt(),oe()}function zt(){let e=a("ownerFilter");if(!e)return;[...new Set(P.map(n=>n.appMgrName))].filter(Boolean).sort().forEach(n=>{let s=document.createElement("option");s.value=n,s.textContent=n,e.appendChild(s)})}function Xt(){a("searchInput")?.addEventListener("input",B),a("regexMode")?.addEventListener("change",B),a("fromDate")?.addEventListener("change",B),a("toDate")?.addEventListener("change",B),a("dateFilterField")?.addEventListener("change",B),a("assessmentStatusFilter")?.addEventListener("change",B),a("ownerFilter")?.addEventListener("change",B),a("clearFiltersBtn")?.addEventListener("click",Zt),a("refreshBtn")?.addEventListener("click",an),a("checkPrereqBtn")?.addEventListener("click",Ze),a("selectAllBtn")?.addEventListener("click",nn),a("clearSelectionBtn")?.addEventListener("click",sn),a("validateBtn")?.addEventListener("click",on),a("reviewBtn")?.addEventListener("click",rn),a("cancelBtn")?.addEventListener("click",async()=>{await chrome.runtime.sendMessage({action:"STOP_VALIDATION"})}),a("cancelReviewBtn")?.addEventListener("click",async()=>{await chrome.runtime.sendMessage({action:"STOP_REVIEW"})}),a("retryFailedBtn")?.addEventListener("click",Rn),a("clearResultsBtn")?.addEventListener("click",xn),a("clearReviewResultsBtn")?.addEventListener("click",Cn),a("exportBtn")?.addEventListener("click",In),a("validationTabBtn")?.addEventListener("click",()=>U("validation")),a("reviewTabBtn")?.addEventListener("click",()=>U("review")),a("closeReviewNotesModalBtn")?.addEventListener("click",Ae),a("reviewNotesModal")?.addEventListener("click",e=>{e.target===a("reviewNotesModal")&&Ae()}),a("copyReviewNotesBtn")?.addEventListener("click",bn),a("selectAllReviewNotesBtn")?.addEventListener("click",hn),a("downloadReviewNotesBtn")?.addEventListener("click",cn),An()}function B(){let e={search:a("searchInput")?.value||"",regexMode:a("regexMode")?.checked||!1,fromDate:a("fromDate")?.value||"",toDate:a("toDate")?.value||"",dateFilterField:a("dateFilterField")?.value||"surveyCompletedOn",assessmentStatus:a("assessmentStatusFilter")?.value||""};_=De(P,e);let t=a("ownerFilter")?.value;t&&(_=_.filter(n=>n.appMgrName===t)),oe()}function Zt(){a("searchInput").value="",a("regexMode").checked=!1,a("fromDate").value="",a("toDate").value="",a("dateFilterField").value="surveyCompletedOn",a("assessmentStatusFilter").value="",a("ownerFilter").value="",_=[...P],oe()}function oe(){let e=a("assessmentList");e.innerHTML="",_.forEach(t=>{let n=en(t),s=document.createElement("div");s.className=`assessment-row ${n.className}`,s.innerHTML=`

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

                        ${ie(t)?`<strong>Incomplete initiated date:</strong> ${F(t.incompleteInitiatedOn||t.raw?.incompleteInitiatedOn)||"N/A"}`:`<strong>Assessed date:</strong> ${F(t.attestOn||t.raw?.attestOn)||"N/A"} \u2022 <strong>Survey completed date:</strong> ${F(t.surveyCompletedOn||t.raw?.surveyCompletedOn)||"N/A"}`}

                    </div>

                    <div class="asset-sub status-detail">

                        ${n.detail}

                    </div>

                </div>

            `,e.appendChild(s)}),tn(),Ye()}function en(e){if(ie(e)){let o=e.incompleteInitiatedByName||e.raw?.incompleteInitiatedByName||"N/A",l=e.incompleteInitiatedOn||e.raw?.incompleteInitiatedOn;return{label:"Incomplete",className:"status-incomplete",detail:`Incomplete mark \u2022 Initiated by ${o}${l?` \u2022 ${F(l)}`:""}`}}let n=e.attestName||e.raw?.attestName||"N/A",s=e.attestOn||e.raw?.attestOn;return{label:"Completed",className:"status-completed",detail:`Attested by ${n}${s?` \u2022 ${F(s)}`:""}`}}function F(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?e:t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"2-digit"})}function tn(){document.querySelectorAll(".assessment-checkbox").forEach(e=>{e.addEventListener("change",t=>{let n=Number(t.target.dataset.id);t.target.checked?$.includes(n)||$.push(n):$=$.filter(s=>s!==n),Ye()})})}function Ye(){a("selectedCount").textContent=`${$.length} Selected`}function nn(){$=Fe(_),oe()}function sn(){$=[],oe()}async function an(){a("refreshBtn").disabled=!0;try{await chrome.runtime.sendMessage({action:"REFRESH_ASSESSMENTS"}),await We()}finally{a("refreshBtn").disabled=!1}}async function on(){let e=P.filter(t=>$.includes(t.assessmentId));if(e.length===0){alert("Select at least one assessment.");return}J=!1,U("validation"),a("progressContainer")?.classList.remove("hidden"),a("cancelBtn")?.classList.remove("hidden"),a("cancelReviewBtn")?.classList.add("hidden"),a("retryFailedBtn")?.classList.add("hidden"),await chrome.runtime.sendMessage({action:"START_VALIDATION",assessments:e})}async function rn(){let e=P.filter(t=>$.includes(t.assessmentId));if(e.length===0){alert("Select at least one assessment.");return}ne=!1,U("review"),a("progressContainer")?.classList.remove("hidden"),W({completed:0,total:e.length,current:"Starting review",startedAt:Date.now(),type:"review"}),a("cancelReviewBtn")?.classList.remove("hidden"),a("cancelBtn")?.classList.add("hidden"),a("retryFailedBtn")?.classList.add("hidden"),a("reviewBtn").disabled=!0,await chrome.runtime.sendMessage({action:"START_REVIEW",assessments:e})}function ln(){setInterval(async()=>{let e=await chrome.storage.local.get(["validationProgress","validationComplete","validationResults","validationError","reviewProgress","reviewComplete","reviewResults","reviewError",E.STORAGE_KEYS.LAST_ACTION]),t=e[E.STORAGE_KEYS.LAST_ACTION]||O;t==="validation"&&e.validationProgress&&!e.validationComplete&&W(e.validationProgress,"validation"),e.validationComplete&&!J&&(A=e.validationResults||[],Ne(A),J=!0,U("validation"),a("exportBtn")?.classList.remove("hidden"),a("clearResultsBtn")?.classList.remove("hidden"),a("cancelBtn")?.classList.add("hidden"),W(e.validationProgress,"validation"),(await re()).length?a("retryFailedBtn")?.classList.remove("hidden"):a("retryFailedBtn")?.classList.add("hidden")),t==="review"&&e.reviewProgress&&!e.reviewComplete&&W(e.reviewProgress,"review"),e.reviewComplete&&!ne&&(R=e.reviewResults||[],de(R),ne=!0,U("review"),a("reviewBtn").disabled=!1,W(e.reviewProgress,"review"),a("cancelReviewBtn")?.classList.add("hidden"),a("clearReviewResultsBtn")?.classList.remove("hidden")),t==="validation"&&e.validationError&&!e.validationProgress&&(a("cancelBtn")?.classList.add("hidden"),a("progressText").textContent=e.validationError),e.reviewError&&(a("reviewBtn").disabled=!1,a("cancelReviewBtn")?.classList.add("hidden"))},1e3)}function W(e,t=O){if(!e||!e.total)return;let n=Math.round(e.completed/e.total*100),s=e.completedAt||Date.now(),o=e.startedAt||s,l=Math.max(0,s-o),r=e.completed>=e.total,i=!r&&e.completed>0?be(Math.max(0,l/e.completed*(e.total-e.completed))):r?"Complete":"Calculating",d=t==="review"?"Review":"Validation",c=e.current&&!String(e.current).toLowerCase().includes("completed")?` \u2022 Current: ${e.current}`:"";a("progressText").textContent=r?`${d} complete: ${e.completed}/${e.total} processed \u2022 Time Elapsed: ${be(l)} \u2022 Estimated Time: Complete`:`${d} in progress: ${e.completed}/${e.total} processed${c} \u2022 Time Elapsed: ${be(l)} \u2022 Estimated Time: ${i}`,a("progressFill").style.width=`${n}%`}function be(e){let t=Math.max(0,Math.round(e/1e3));if(t<60)return`${t}s`;let n=Math.floor(t/60),s=t%60;return`${n}m ${s}s`}function U(e){O=e==="review"?"review":"validation",a("validationTabBtn")?.classList.toggle("active",O==="validation"),a("reviewTabBtn")?.classList.toggle("active",O==="review"),a("resultsContainer")?.classList.toggle("hidden",O!=="validation"),a("reviewResultsContainer")?.classList.toggle("hidden",O!=="review"),q()}function q(){let e=A&&A.length>0,t=R&&R.length>0;a("exportBtn")?.classList.toggle("hidden",O!=="validation"||!e),a("clearResultsBtn")?.classList.toggle("hidden",O!=="validation"||!e),a("clearReviewResultsBtn")?.classList.toggle("hidden",O!=="review"||!t)}function Ne(e){let t=a("validationCardsContainer");if(t.innerHTML="",!e||e.length===0){q();return}e.forEach(n=>{let s=document.createElement("div");s.className="result-card";let o=n.results&&n.results.some(i=>i.reason==="Question identifier was not found in the survey questions."),l=n.summary?n.summary.score:null,r=l!==null&&l<90;s.innerHTML=`

                <div class="result-header">

                    <strong>

                        ${n.assetName}

                    </strong>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${o?'<span class="score-error-indicator" title="Question identifier was not found in the survey questions.">! Error</span>':""}
                        <span class="score-pill ${r?"score-low":""}">
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
            `,t.appendChild(s)}),document.querySelectorAll(".download-context").forEach(n=>{n.addEventListener("click",()=>{Ln(n.dataset.id)})}),q()}function de(e){let t=a("reviewCardsContainer");if(t.innerHTML="",!e||e.length===0){t.innerHTML='<div class="review-empty">No review results yet.</div>',q();return}e.forEach(n=>{let s=document.createElement("div"),o=n.status==="Incomplete"?"status-incomplete":"status-completed";s.className=`review-card ${o}`;let l=n.status==="Incomplete"?`
                        <div><strong>Survey Completed On:</strong> ${n.surveyCompletedOnFormatted||"N/A"}</div>
                        <div><strong>Due On:</strong> ${n.dueOnFormatted||"N/A"}</div>
                        <div><strong>Incomplete Initiated On:</strong> ${n.incompleteInitiatedOnFormatted||"N/A"}</div>
                    `:`
                        <div><strong>Survey Completed On:</strong> ${n.surveyCompletedOnFormatted||"N/A"}</div>
                        <div><strong>Due On:</strong> ${n.dueOnFormatted||"N/A"}</div>
                    `;s.innerHTML=`
                <div class="review-card-header">
                    <div class="review-card-title">
                        ${n.assetName||"Unknown Assessment"}
                        <span>Assessment ID: ${n.assessmentId||"N/A"}</span>
                    </div>
                    <span class="status-pill ${o}">
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
            `,t.appendChild(s)}),document.querySelectorAll(".review-notes-btn").forEach(n=>{n.addEventListener("click",()=>dn(n.dataset.id))}),q()}async function cn(){if(!u||u.error)return;let e=Je(u);e.length!==0&&await Ue({...u,workQueue:e})}function dn(e){let t=R.find(n=>String(n.assessmentId)===String(e));!t||t.error||(u=t,a("reviewNotesTitle").textContent=t.assetName||"Review Notes",a("reviewNotesMeta").innerHTML=t.notesMetaHtml||"",pn(t),xe(),a("reviewNotesModal")?.classList.remove("hidden"))}function Ae(){a("reviewNotesModal")?.classList.add("hidden"),u=null}async function un(){Y=(await chrome.storage.local.get("reviewQuestionNotes")).reviewQuestionNotes||{}}async function mn(){await chrome.storage.local.set({reviewQuestionNotes:Y})}function pn(e){let t=V(e);M[t]||(M[t]=(e.workQueue||[]).map((n,s)=>X(n,s)))}function xe(){let e=a("reviewNotesContent");if(!e||!u)return;let t=u.workQueue||[];if(t.length===0){e.innerHTML='<div class="review-output-empty">No reachable unanswered work queue items were found.</div>',Ee();return}let n=V(u),s=new Set(M[n]||[]);e.innerHTML=t.map((o,l)=>fn(o,l,s.has(X(o,l)))).join(""),wn(),Ee()}function fn(e,t,n){let s=X(e,t),o=ze(u,e,t),l=(e.options||[]).length?(e.options||[]).map(r=>`<li>${y(Sn(r))}</li>`).join(""):"<li>&lt;no options&gt;</li>";return`
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
                <ol>${l}</ol>
            </div>
            <div class="review-asa-note ${o?"":"hidden"}" data-note-preview="${y(s)}">
                <strong>ASA Notes:</strong>
                <span>${y(o)}</span>
            </div>
            <div class="review-note-editor hidden" data-note-editor="${y(s)}">
                <textarea
                    class="review-note-input"
                    data-note-input="${y(s)}"
                    placeholder="Write ASA notes for this question..."
                >${y(o)}</textarea>
                <button
                    type="button"
                    class="btn-secondary review-note-save-btn"
                    data-key="${y(s)}"
                >
                    Save Notes
                </button>
            </div>
        </section>
    `}function wn(){document.querySelectorAll(".review-question-checkbox").forEach(e=>{e.addEventListener("change",()=>{vn(e.dataset.key,e.checked),Ee()})}),document.querySelectorAll(".review-note-icon-btn").forEach(e=>{e.addEventListener("click",()=>gn(e.dataset.key))}),document.querySelectorAll(".review-note-save-btn").forEach(e=>{e.addEventListener("click",()=>yn(e.dataset.key))})}function vn(e,t){let n=V(u),s=new Set(M[n]||[]);t?s.add(e):s.delete(e),M[n]=[...s]}function hn(){if(!u)return;let e=V(u),t=(u.workQueue||[]).map((s,o)=>X(s,o)),n=M[e]||[];M[e]=n.length===t.length?[]:t,xe()}function Ee(){let e=a("downloadReviewNotesBtn"),t=a("selectAllReviewNotesBtn");if(!e||!u)return;let n=(u.workQueue||[]).length,s=Je(u).length;e.textContent=`Download Review Notes (${s}/${n})`,e.disabled=s===0,t&&(t.textContent=s===n&&n>0?"Deselect All":"Select All",t.disabled=n===0)}function Je(e){let t=V(e),n=new Set(M[t]||[]);return(e.workQueue||[]).map((s,o)=>({item:s,index:o,key:X(s,o)})).filter(s=>n.has(s.key)).map(s=>({...s.item,asaNotes:ze(e,s.item,s.index)}))}function gn(e){document.querySelector(`[data-note-editor="${Xe(e)}"]`)?.classList.toggle("hidden")}async function yn(e){let n=document.querySelector(`[data-note-input="${Xe(e)}"]`)?.value.trim()||"",s=V(u);Y[s]||(Y[s]={}),Y[s][e]=n,await mn(),xe()}function ze(e,t,n){let s=V(e),o=X(t,n);return Y[s]?.[o]||""}function V(e){return String(e?.assessmentId||"active")}function X(e,t){return String(e?.surveyTemplateQuestionId||e?.questionId||`question-${t}`)}function Sn(e){return`${e.index||""}. ${e.internalValue||e.displayValue||"<no options>"}`}function y(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Xe(e){return window.CSS?.escape?CSS.escape(e):String(e).replace(/\\/g,"\\\\").replace(/"/g,'\\"')}async function bn(){if(!u)return;let t=`<!doctype html><html><head><meta charset="utf-8"></head><body>${u.reviewOutputCopyHtml||u.reviewOutputHtml||u.notesHtml||""}</body></html>`,n=u.reviewOutputText||u.notesText||a("reviewNotesContent")?.innerText||"",s=u.reviewOutputRtf||"";try{if(navigator.clipboard?.write&&window.ClipboardItem){let o={"text/html":new Blob([t],{type:"text/html"}),"text/plain":new Blob([n],{type:"text/plain"})};s&&(o["text/rtf"]=new Blob([s],{type:"text/rtf"}));try{await navigator.clipboard.write([new ClipboardItem(o)])}catch{await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([t],{type:"text/html"}),"text/plain":new Blob([n],{type:"text/plain"})})])}}else await navigator.clipboard.writeText(n);a("copyReviewNotesBtn").textContent="Copied",setTimeout(()=>{a("copyReviewNotesBtn").textContent="Copy Review Output"},1200)}catch{await navigator.clipboard.writeText(n)}}function An(){let e=new Map(Re.map(t=>[t.id,t.openUrl||t.url]));document.querySelectorAll(".prereq-open-link").forEach(t=>{let n=e.get(t.dataset.site);n&&(t.href=n,t.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),chrome.tabs.create({url:n})}))})}async function En(){let e=await chrome.storage.local.get("prerequisiteStatus");e.prerequisiteStatus&&et(e.prerequisiteStatus)}async function Ze(){Tn();try{let e=await chrome.runtime.sendMessage({action:"CHECK_PREREQUISITES"});e?.success&&e.prerequisites&&et(e.prerequisites)}catch(e){a("prereqSummary").textContent=`Unable to check sessions: ${e.message}`,document.querySelectorAll(".prereq-item .signal").forEach(t=>{t.className="signal signal-fail"})}}function Tn(){a("prereqSummary").textContent="Checking Cairo, ESATS, and GTC sessions...",document.querySelectorAll(".prereq-item").forEach(e=>{let t=e.querySelector(".signal"),n=e.querySelector("small");t.className="signal signal-checking",n&&(n.textContent="Checking..."),e.title="Checking session..."})}function et(e){let t=e.checks||[];t.forEach(s=>{let o=document.querySelector(`.prereq-item[data-site="${s.id}"]`);if(!o)return;let l=o.querySelector(".signal"),r=o.querySelector("small");l.className=`signal ${s.passed?"signal-pass":"signal-fail"}`,r&&(r.textContent=s.passed?"Active":"Needs sign-in"),o.title=`${s.message}. Final URL: ${s.finalUrl}`});let n=t.filter(s=>!s.passed);if(n.length===0&&t.length>0){a("prereqSummary").textContent="All prerequisite sessions are active.";return}if(t.length===0){a("prereqSummary").textContent="Session checks have not run yet.";return}a("prereqSummary").textContent=`${n.length} session check${n.length===1?"":"s"} need attention. Open the help tooltip for sign-in steps.`}async function Nn(){A=await Ie(),R=await Oe(),A&&A.length&&(Ne(A),J=!0,a("exportBtn")?.classList.remove("hidden"),a("clearResultsBtn")?.classList.remove("hidden")),R&&R.length?(de(R),ne=!0):de([]);let e=await chrome.storage.local.get(E.STORAGE_KEYS.LAST_ACTION);U(e[E.STORAGE_KEYS.LAST_ACTION]==="review"?"review":"validation"),(await re()).length&&a("retryFailedBtn")?.classList.remove("hidden")}async function xn(){await chrome.runtime.sendMessage({action:"CLEAR_RESULTS"}),A=[],Ne(A),J=!1,a("retryFailedBtn")?.classList.add("hidden"),a("cancelBtn")?.classList.add("hidden"),a("progressContainer")?.classList.add("hidden"),a("progressFill").style.width="0%",a("progressText").textContent="Starting...",q()}async function Cn(){await chrome.runtime.sendMessage({action:"CLEAR_REVIEW_RESULTS"}),R=[],de(R),ne=!1,a("reviewBtn").disabled=!1,a("cancelReviewBtn")?.classList.add("hidden"),Ae(),q()}async function Rn(){let e=await re();e.length!==0&&(J=!1,a("progressContainer")?.classList.remove("hidden"),W({completed:0,total:e.length,current:"Starting validation",startedAt:Date.now()}),a("cancelBtn")?.classList.remove("hidden"),a("retryFailedBtn")?.classList.add("hidden"),await chrome.runtime.sendMessage({action:"START_VALIDATION",assessments:e}))}async function Ln(e){let n=(await $e())[e];if(!n)return;let s=new Blob([JSON.stringify(n,null,2)],{type:"application/json"}),o=URL.createObjectURL(s),l=document.createElement("a");l.href=o,l.download=`context_${e}.json`,l.click(),URL.revokeObjectURL(o)}async function In(){!A||A.length===0||await Me(A)}async function On(){let e=a("whatsNewIcon"),t=a("surveyDiffModal"),n=a("closeModalBtn"),s=a("refreshDiffBtn"),o=a("surveyFromSearch"),l=a("surveyToSearch"),r=a("runSurveyDiffBtn");!e||!t||!n||(e.addEventListener("click",async()=>{t.classList.remove("hidden");try{await kn()}catch(i){console.error("Survey diff modal restore error:",i),Ce(),D(null,"Unable to load survey versions.")}}),n.addEventListener("click",()=>{t.classList.add("hidden")}),t.addEventListener("click",i=>{i.target===t&&t.classList.add("hidden")}),s&&s.addEventListener("click",Dn),o?.addEventListener("focus",()=>{k("from"),a("surveyFromOptions")?.classList.remove("hidden")}),o?.addEventListener("input",()=>{f=null,v=null,l&&(l.value="",l.disabled=!0,l.placeholder="Select From first"),ae(),se(),Q({selectedFromId:null,selectedToId:null,diff:null}),k("from"),a("surveyFromOptions")?.classList.remove("hidden")}),l?.addEventListener("focus",()=>{f&&(k("to"),a("surveyToOptions")?.classList.remove("hidden"))}),l?.addEventListener("input",()=>{v=null,ae(),se(),Q({selectedFromId:f?.surveyTemplateId||null,selectedToId:null,diff:null}),k("to"),a("surveyToOptions")?.classList.remove("hidden")}),r?.addEventListener("click",Bn),document.addEventListener("click",i=>{i.target.closest(".survey-combobox")||(a("surveyFromOptions")?.classList.add("hidden"),a("surveyToOptions")?.classList.add("hidden"))}))}async function ue(){return(await chrome.storage.local.get(E.STORAGE_KEYS.WHATS_NEW_MODAL))[E.STORAGE_KEYS.WHATS_NEW_MODAL]||{}}async function Q(e){let t=await ue();await chrome.storage.local.set({[E.STORAGE_KEYS.WHATS_NEW_MODAL]:{...t,...e,updatedAt:Date.now()}})}function Ke(e){return C.find(t=>Number(t.surveyTemplateId)===Number(e))||null}function $n(){let e=a("surveyFromSearch"),t=a("surveyToSearch");e&&(e.value=f?z(f):""),t&&(t.value=v?z(v):"",t.disabled=!f,t.placeholder=f?"Search newer versions...":"Select From first"),ae()}async function kn(){let e=await ue();Array.isArray(e.templates)&&e.templates.length>0&&(C=Te(e.templates)),C.length===0&&(Ce(),D(null,"Loading survey versions..."),await tt()),f=e.selectedFromId?Ke(e.selectedFromId):null,v=e.selectedToId?Ke(e.selectedToId):null,f&&v&&v.versionNumber<=f.versionNumber&&(v=null),$n(),k("from"),e.diff&&f&&v?D(e.diff):D(null,"Select a From and To version, then click What's New.")}async function Dn(){let e=a("refreshDiffBtn");if(!(!e||e.disabled)){e.disabled=!0,e.setAttribute("aria-busy","true"),te+=1;try{Ce(),se(),await Q({selectedFromId:null,selectedToId:null,diff:null,templates:[]}),await tt(!0)}catch(t){console.error("Survey template refresh error:",t),D(null,"Unable to load survey versions.")}finally{e.disabled=!1,e.removeAttribute("aria-busy")}}}function Te(e){return(Array.isArray(e)?e:Object.values(e||{})).filter(n=>n&&n.surveyTemplateId&&n.versionNumber!==void 0&&n.versionNumber!==null).map(n=>({...n,surveyTemplateId:Number(n.surveyTemplateId),versionNumber:Number(n.versionNumber)})).filter(n=>!Number.isNaN(n.surveyTemplateId)&&!Number.isNaN(n.versionNumber)).sort((n,s)=>s.versionNumber-n.versionNumber)}async function tt(e=!1){if(C.length>0&&!e){k("from");return}if(!e){let n=await ue();if(Array.isArray(n.templates)&&n.templates.length>0){C=Te(n.templates),k("from");return}}e&&(C=[]);let t=a("surveyFromSearch");t&&(t.placeholder="Loading versions...",t.disabled=!0);try{C=Te(await He()),await Q({templates:C}),t&&(t.disabled=!1,t.placeholder="Search versions..."),k("from")}catch(n){throw console.error("Survey template load error:",n),t&&(t.disabled=!1,t.placeholder="Unable to load versions"),n}}function Ce(){f=null,v=null;let e=a("surveyFromSearch"),t=a("surveyToSearch");e&&(e.value="",e.disabled=!1,e.placeholder="Search versions..."),t&&(t.value="",t.disabled=!0,t.placeholder="Select From first"),a("surveyFromOptions")?.classList.add("hidden"),a("surveyToOptions")?.classList.add("hidden"),a("surveyFromOptions")&&(a("surveyFromOptions").innerHTML=""),a("surveyToOptions")&&(a("surveyToOptions").innerHTML=""),ae()}function se(){let e=a("diffDateRange"),t=a("diffContent");e&&(e.textContent="",e.classList.add("hidden")),t&&(t.innerHTML="")}function z(e){let t=e.releasedOn?F(e.releasedOn):"-",n=e.deactivatedOn?F(e.deactivatedOn):"-";return`Version-${e.versionNumber} (Released on: ${t}, Deactivated on: ${n})`}function Fn(e){return e==="to"?f?C.filter(t=>t.versionNumber>f.versionNumber):[]:C}function k(e){let t=a(e==="from"?"surveyFromSearch":"surveyToSearch"),n=a(e==="from"?"surveyFromOptions":"surveyToOptions");if(!t||!n)return;let s=t.value.trim().toLowerCase(),o=Fn(e).filter(l=>z(l).toLowerCase().includes(s));if(n.innerHTML="",o.length===0){let l=document.createElement("div");l.className="survey-option-empty",l.textContent=C.length===0?"No survey versions found.":"No matching versions.",n.appendChild(l);return}o.forEach(l=>{let r=document.createElement("button");r.type="button",r.className="survey-option",r.value=String(l.surveyTemplateId),r.textContent=z(l),r.addEventListener("click",()=>{Mn(e,l)}),n.appendChild(r)})}function Mn(e,t){if(e==="from"){f=t,v=null;let n=a("surveyFromSearch"),s=a("surveyToSearch");n&&(n.value=z(t)),s&&(s.value="",s.disabled=!1,s.placeholder="Search newer versions..."),a("surveyFromOptions")?.classList.add("hidden"),k("to"),se(),Q({selectedFromId:t.surveyTemplateId,selectedToId:null,diff:null})}else{v=t;let n=a("surveyToSearch");n&&(n.value=z(t)),a("surveyToOptions")?.classList.add("hidden"),se(),Q({selectedFromId:f?.surveyTemplateId||null,selectedToId:t.surveyTemplateId,diff:null})}ae()}function ae(){let e=a("runSurveyDiffBtn");e&&e.classList.toggle("hidden",!f||!v)}async function Bn(){if(!f||!v)return;let e=a("runSurveyDiffBtn"),t=te+1;te=t,e&&(e.disabled=!0,e.textContent="Loading...");try{let n=await ue();if(n.diff&&Number(n.selectedFromId)===Number(f.surveyTemplateId)&&Number(n.selectedToId)===Number(v.surveyTemplateId)){D(n.diff);return}D(null,"Loading changes...");let s=await je(f.surveyTemplateId,v.surveyTemplateId);t===te&&(D(s),await Q({selectedFromId:f.surveyTemplateId,selectedToId:v.surveyTemplateId,diff:s}))}catch(n){console.error("Survey diff error:",n),t===te&&D(null,"Unable to load survey differences.")}finally{e&&(e.disabled=!1,e.textContent="What's New")}}function D(e,t="No changes detected between the selected survey templates."){let n=a("diffDateRange"),s=a("diffContent");if(!n||!s)return;if(s.innerHTML="",!e||e.newQuestions.length===0&&e.removedQuestions.length===0&&e.modifiedQuestions.length===0){n.classList.add("hidden");let r=document.createElement("div");r.className="diff-empty",r.textContent=t,s.appendChild(r);return}let o=e.metadata.fromReleasedOn||e.metadata.fromUpdatedOn?F(e.metadata.fromReleasedOn||e.metadata.fromUpdatedOn):"Unknown",l=e.metadata.toReleasedOn||e.metadata.toUpdatedOn?F(e.metadata.toReleasedOn||e.metadata.toUpdatedOn):"Unknown";n.textContent=`From V-${e.metadata.fromVersionNumber||e.metadata.fromId} (${o}) to V-${e.metadata.toVersionNumber||e.metadata.toId} (${l})`,n.classList.remove("hidden"),e.newQuestions.forEach(r=>{let i=document.createElement("div");i.className="diff-item",i.innerHTML=`
            <h4><span class="diff-tag new">New Question</span> <span class="diff-id">[${r.alternateQuestionId}]</span></h4>
            <div class="diff-detail"><strong>Context:</strong> ${r.questionText||"\u2014"}</div>
        `,s.appendChild(i)}),e.removedQuestions.forEach(r=>{let i=document.createElement("div");i.className="diff-item",i.innerHTML=`
            <h4><span class="diff-tag removed">Removed Question</span> <span class="diff-id">[${r.alternateQuestionId}]</span></h4>
            <div class="diff-detail"><strong>Context:</strong> ${r.questionText||"\u2014"}</div>
        `,s.appendChild(i)}),e.modifiedQuestions.forEach(r=>{let i=document.createElement("div");i.className="diff-item";let d="",c="";r.textChanged&&(d+='<span class="diff-tag changed">Question Changed</span>',c+=`
                <div class="diff-detail"><strong>Old:</strong> ${r.textChanged.old}</div>
                <div class="diff-detail"><strong>New:</strong> ${r.textChanged.new}</div>
            `),r.optionsChanged&&(d+='<span class="diff-tag changed">Options Changed</span>',r.optionsChanged.added?.length>0&&(c+=`<div class="diff-detail"><strong>Added Options:</strong> ${r.optionsChanged.added.join(", ")}</div>`),r.optionsChanged.removed?.length>0&&(c+=`<div class="diff-detail"><strong>Removed Options:</strong> ${r.optionsChanged.removed.join(", ")}</div>`)),i.innerHTML=`
            <h4>${d} <span class="diff-id">[${r.alternateQuestionId}]</span></h4>
            ${c}
        `,s.appendChild(i)})}
